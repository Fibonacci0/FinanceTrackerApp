import React, { useState, useMemo } from "react";
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider } from './context/AuthProvider';
import LoginScreen from './app/login';
import HomeScreen from './app/home';
import SignupScreen from './app/signup';
import ProfileScreen from './app/profile';
import SettingsScreen from './app/settings';
import { Ionicons } from "@expo/vector-icons";

// Theme context
export const ThemeContext = React.createContext({
  primaryColor: "#2e86de",
  secondaryColor: "#27ae60",
  setTheme: (_: { primaryColor: string; secondaryColor: string }) => {},
});

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          if (route.name === "Home") return <Ionicons name="home-outline" size={size} color={color} />;
          if (route.name === "Profile") return <Ionicons name="person-outline" size={size} color={color} />;
          if (route.name === "Settings") return <Ionicons name="settings-outline" size={size} color={color} />;
          return null;
        },
        tabBarActiveTintColor: "#2e86de",
        tabBarInactiveTintColor: "#888",
        headerShown: true,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [theme, setTheme] = useState({
    primaryColor: "#2e86de",
    secondaryColor: "#27ae60",
  });
  const themeValue = useMemo(() => ({
    ...theme,
    setTheme: (t: { primaryColor: string; secondaryColor: string }) => setTheme(t),
  }), [theme]);

  return (
    <AuthProvider>
      <ThemeContext.Provider value={themeValue}>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeContext.Provider>
    </AuthProvider>
  );
}
