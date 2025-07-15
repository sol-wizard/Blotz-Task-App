import React, { useEffect } from "react";
import { View } from "react-native";
import { Button, Text, ActivityIndicator } from "react-native-paper";
import { router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";

export default function Index() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    // If not loading and not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated]);

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={{ marginTop: 16 }}>
          Loading...
        </Text>
      </View>
    );
  }

  // If not authenticated, show nothing (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // Authenticated user sees the home page
  return (
    <View className="flex-1 justify-center items-center p-6">
      <Text variant="headlineMedium" style={{ marginBottom: 16 }}>
        Welcome to Blotz!
      </Text>
      
      {user && (
        <Text variant="bodyLarge" style={{ marginBottom: 32, textAlign: 'center' }}>
          Hello, {user.name}! 🎉{'\n'}
          {user.email}
        </Text>
      )}

      <Button 
        mode="outlined" 
        onPress={logout}
        style={{ marginTop: 16 }}
      >
        Sign Out
      </Button>
    </View>
  );
}
