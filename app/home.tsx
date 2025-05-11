// To use the donut chart, install dependencies:
// expo install react-native-svg
// npm install victory-native

import React, { useEffect, useState, useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import { BarChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";

interface Transaction {
  id: string;
  user_id: string;
  date: string;
  description?: string | null;
  amount: number;
  type: "income" | "expense";
  created_at: string;
}

type TransactionFormState = {
  date: string;
  description: string;
  amount: string;
  type: "income" | "expense";
};

const initialFormState: TransactionFormState = {
  date: "",
  description: "",
  amount: "",
  type: "expense",
};

export default function HomeScreen() {
  const { session } = useAuth();
  const navigation = useNavigation();

  // Add profile icon to header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 16 }}
          onPress={() => navigation.navigate("Profile" as never)}
        >
          <Ionicons name="person-circle-outline" size={32} color="#2e86de" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<TransactionFormState>(initialFormState);
  const [formLoading, setFormLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from<Transaction>("transactions")
      .select("*")
      .eq("user_id", session.user.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setTransactions([]);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Correct balance logic: income adds, expense subtracts
  const balance = transactions.reduce(
    (sum, t) =>
      t.type === "income"
        ? sum + Number(t.amount)
        : sum - Number(t.amount),
    0
  );

  // Bar chart data for react-native-chart-kit
  const incomeTotal = Number(
    transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0)
  ) || 0;
  const expenseTotal = Number(
    transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0)
  ) || 0;

  const barChartData = {
    labels: ["Income", "Expense"],
    datasets: [
      {
        data: [incomeTotal, expenseTotal],
      },
    ],
  };
  const chartWidth = Math.min(Dimensions.get("window").width - 48, 340);

  // Logout handler (move up to avoid ReferenceError)
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  };

  // CRUD Handlers
  const openAddModal = () => {
    setEditingId(null);
    setForm({
      ...initialFormState,
      date: new Date().toISOString().slice(0, 10),
    });
    setModalVisible(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setForm({
      date: transaction.date,
      description: transaction.description ?? "",
      amount: String(transaction.amount),
      type: transaction.type,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert("Delete Transaction", "Are you sure you want to delete this transaction?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("transactions").delete().eq("id", id);
          if (error) {
            Alert.alert("Error", error.message);
          } else {
            setTransactions((prev) => prev.filter((t) => t.id !== id));
          }
        },
      },
    ]);
  };

  const handleFormChange = (key: keyof TransactionFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleFormSubmit = async () => {
    if (!form.date || !form.amount || !form.type) {
      Alert.alert("Date, amount, and type are required.");
      return;
    }
    setFormLoading(true);
    if (editingId) {
      // Update
      const { error, data } = await supabase
        .from("transactions")
        .update({
          date: form.date,
          description: form.description || null,
          amount: Number(form.amount),
          type: form.type,
        })
        .eq("id", editingId)
        .single();
      if (error) {
        Alert.alert("Error", error.message);
      } else {
        setTransactions((prev) =>
          prev.map((t) => (t.id === editingId ? { ...t, ...data } : t))
        );
        setModalVisible(false);
      }
    } else {
      // Create
      const { error, data } = await supabase
        .from("transactions")
        .insert([
          {
            user_id: session?.user?.id,
            date: form.date,
            description: form.description || null,
            amount: Number(form.amount),
            type: form.type,
          },
        ])
        .single();
      if (error) {
        Alert.alert("Error", error.message);
      } else {
        setTransactions((prev) => [data, ...prev]);
        setModalVisible(false);
      }
    }
    setFormLoading(false);
  };

  // ListHeaderComponent for FlatList
  const ListHeader = (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>Finance Dashboard</Text>
        <Text style={styles.userEmail}>{session?.user.email}</Text>
      </View>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text
          style={[
            styles.balanceValue,
            balance > 0 ? styles.positive : balance < 0 ? styles.negative : null,
          ]}
        >
          ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Text>
      </View>
      <View style={styles.donutSection}>
        <Text style={styles.sectionTitle}>Income vs Expense</Text>
        {(incomeTotal > 0 || expenseTotal > 0) ? (
          <BarChart
            data={barChartData}
            width={chartWidth}
            height={180}
            yAxisLabel="$"
            chartConfig={{
              backgroundColor: "#fff",
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 2,
              color: (opacity = 1) => `rgba(46, 134, 222, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(34, 34, 34, ${opacity})`,
              style: { borderRadius: 16 },
              propsForBackgroundLines: { stroke: "#eee" },
              propsForLabels: { fontWeight: "bold" },
            }}
            style={{ borderRadius: 16, marginVertical: 8 }}
            fromZero
            showValuesOnTopOfBars
          />
        ) : (
          <Text style={styles.emptyText}>No data to display.</Text>
        )}
      </View>
      <Text style={styles.sectionTitle}>Recent Transactions</Text>
    </View>
  );

  return (
    <View style={styles.outer}>
      {loading ? (
        <ActivityIndicator size="large" color="#2e86de" style={{ marginTop: 32 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.transactionItem}
              onPress={() => openEditModal(item)}
            >
              <View style={styles.transactionLeft}>
                <Text style={styles.transactionDesc}>
                  {item.description ? item.description : <Text style={styles.noDesc}>No description</Text>}
                </Text>
                <Text style={styles.transactionDate}>{item.date}</Text>
              </View>
              <View style={styles.transactionRight}>
                <Text
                  style={[
                    styles.transactionAmount,
                    item.type === "income" ? styles.income : styles.expense,
                  ]}
                >
                  {item.type === "income" ? "+" : "-"}${Math.abs(Number(item.amount))}
                </Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            </Pressable>
          )}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No transactions found.</Text>
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingId ? "Edit Transaction" : "Add Transaction"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD)"
              value={form.date}
              onChangeText={(text) => handleFormChange("date", text)}
              keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
            />
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              value={form.description}
              onChangeText={(text) => handleFormChange("description", text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Amount"
              value={form.amount}
              onChangeText={(text) => handleFormChange("amount", text)}
              keyboardType="numeric"
            />
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  form.type === "income" && styles.typeButtonActiveIncome,
                ]}
                onPress={() => handleFormChange("type", "income")}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    form.type === "income" && styles.typeButtonTextActive,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  form.type === "expense" && styles.typeButtonActiveExpense,
                ]}
                onPress={() => handleFormChange("type", "expense")}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    form.type === "expense" && styles.typeButtonTextActive,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setModalVisible(false)}
                disabled={formLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleFormSubmit}
                disabled={formLoading}
              >
                {formLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>
                    {editingId ? "Update" : "Add"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: "#f4f6fb",
    paddingTop: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2e86de",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
    marginBottom: 8,
  },
  balanceCard: {
    backgroundColor: "#fff",
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 16,
    color: "#888",
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#222",
  },
  positive: {
    color: "#27ae60",
  },
  negative: {
    color: "#e74c3c",
  },
  donutSection: {
    backgroundColor: "#fff",
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 24,
  },
  donutLegend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 14,
    color: "#555",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
    marginLeft: 8,
    marginBottom: 8,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  transactionList: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  transactionItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  transactionLeft: {
    flex: 1,
    marginRight: 12,
  },
  transactionDesc: {
    fontSize: 16,
    fontWeight: "500",
    color: "#222",
  },
  noDesc: {
    color: "#aaa",
    fontStyle: "italic",
  },
  transactionDate: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: "bold",
    minWidth: 80,
    textAlign: "right",
  },
  income: {
    color: "#27ae60",
  },
  expense: {
    color: "#e74c3c",
  },
  transactionRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  deleteButton: {
    marginLeft: 12,
    padding: 4,
  },
  fab: {
    position: "absolute",
    right: 28,
    bottom: 90,
    backgroundColor: "#2e86de",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2e86de",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#fafbfc",
    color: "#222",
  },
  typeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginHorizontal: 4,
    backgroundColor: "#fafbfc",
    alignItems: "center",
  },
  typeButtonActiveIncome: {
    backgroundColor: "#d4efdf",
    borderColor: "#27ae60",
  },
  typeButtonActiveExpense: {
    backgroundColor: "#f9e1e0",
    borderColor: "#e74c3c",
  },
  typeButtonText: {
    fontSize: 16,
    color: "#555",
    fontWeight: "bold",
  },
  typeButtonTextActive: {
    color: "#222",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  modalCancel: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  modalCancelText: {
    color: "#555",
    fontSize: 16,
  },
  modalSave: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: "#2e86de",
  },
  modalSaveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  logoutButton: {
    backgroundColor: "#e74c3c",
    marginHorizontal: 24,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  error: {
    color: "red",
    textAlign: "center",
    marginVertical: 16,
  },
  emptyText: {
    color: "#888",
    textAlign: "center",
    marginVertical: 32,
    fontSize: 16,
  },
});
