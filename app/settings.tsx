import React, { useContext, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "../App";

const COLOR_SWATCHES = [
  "#2e86de", "#27ae60", "#e74c3c", "#f1c40f", "#8e44ad", "#222222"
];

export default function SettingsScreen() {
  const { primaryColor, secondaryColor, setTheme } = useContext(ThemeContext);
  const [primary, setPrimary] = useState(primaryColor);
  const [secondary, setSecondary] = useState(secondaryColor);

  const handleSave = () => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(primary) || !/^#[0-9A-Fa-f]{6}$/.test(secondary)) {
      Alert.alert("Invalid color", "Please enter valid hex color codes (e.g., #2e86de).");
      return;
    }
    setTheme({ primaryColor: primary, secondaryColor: secondary });
    Alert.alert("Theme updated!");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Primary Color</Text>
        <View style={styles.swatchRow}>
          {COLOR_SWATCHES.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.swatch,
                { backgroundColor: color, borderWidth: primary === color ? 3 : 1, borderColor: primary === color ? "#222" : "#ccc" }
              ]}
              onPress={() => setPrimary(color)}
            />
          ))}
        </View>
        <TextInput
          style={[styles.input, { borderColor: primary }]}
          value={primary}
          onChangeText={setPrimary}
          placeholder="#2e86de"
          autoCapitalize="none"
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Secondary Color</Text>
        <View style={styles.swatchRow}>
          {COLOR_SWATCHES.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.swatch,
                { backgroundColor: color, borderWidth: secondary === color ? 3 : 1, borderColor: secondary === color ? "#222" : "#ccc" }
              ]}
              onPress={() => setSecondary(color)}
            />
          ))}
        </View>
        <TextInput
          style={[styles.input, { borderColor: secondary }]}
          value={secondary}
          onChangeText={setSecondary}
          placeholder="#27ae60"
          autoCapitalize="none"
        />
      </View>
      <TouchableOpacity style={[styles.saveButton, { backgroundColor: primary }]} onPress={handleSave}>
        <Ionicons name="color-palette-outline" size={22} color="#fff" />
        <Text style={styles.saveButtonText}>Save Theme</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fb",
    padding: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2e86de",
    marginBottom: 32,
    marginTop: 16,
  },
  inputGroup: {
    width: "100%",
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: "#555",
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#222",
  },
  swatchRow: {
    flexDirection: "row",
    marginBottom: 12,
    marginTop: 4,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    width: "100%",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
});
