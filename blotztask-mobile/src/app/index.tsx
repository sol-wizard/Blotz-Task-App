import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";
import { AUTH_TOKEN_KEY } from "@/shared/constants/token-key";
import { fetchUserProfile } from "@/shared/services/user-service";
import { useQueryClient } from "@tanstack/react-query";
import { isSameDay } from "date-fns";
import { fetchOverdueTasks, fetchTasksForDate } from "@/shared/services/task-service";

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const initialize = async () => {
      try {
        const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);

        if (!token) {
          setIsAuthenticated(false);
          return;
        }

        // Prefetch data via React Query
        const today = new Date();
        const showFloatingTasks = isSameDay(today, new Date());

        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: ["user-profile"],
            queryFn: fetchUserProfile,
          }),
          queryClient.prefetchQuery({
            queryKey: ["tasks", today.toISOString()],
            queryFn: () => fetchTasksForDate(today, showFloatingTasks),
          }),
          queryClient.prefetchQuery({
            queryKey: ["overdue-tasks"],
            queryFn: fetchOverdueTasks,
          }),
        ]);

        setIsAuthenticated(true);
      } catch (error) {
        console.error("Error during initialization:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [queryClient]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? "/(protected)" : "/(auth)/onboarding"} />;
}
