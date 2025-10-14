import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";
import { AUTH_TOKEN_KEY } from "@/shared/constants/token-key";
import { fetchUserProfile } from "@/shared/services/user-service";
import { useSelectedDayTaskStore } from "@/shared/stores/selectedday-task-store";

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);

      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      // Prefetch data for authenticated users
      await Promise.all([fetchUserProfile(), useSelectedDayTaskStore.getState().loadTasks()]);

      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error during initialization:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? "/(protected)" : "/(auth)/onboarding"} />;
}
