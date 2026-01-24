import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";
import { AUTH_TOKEN_KEY } from "@/shared/constants/token-key";
import { useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { useUserProfile } from "@/shared/hooks/useUserProfile";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

Notifications.setNotificationCategoryAsync("task-reminder", [
  {
    identifier: "MARK_DONE",
    buttonTitle: "Mark as done",
    options: {
      opensAppToForeground: true,
    },
  },
]);

export default function Index() {
  const [isAuthenticateLoading, setIsAuthenticateLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const queryClient = useQueryClient();
  const { userProfile, isUserProfileLoading, isUserProfileFetching } = useUserProfile(isAuthenticated);

  useEffect(() => {
    const initialize = async () => {
      try {
        const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);

        if (!token) {
          setIsAuthenticated(false);
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error("Error during initialization:", error);
        setIsAuthenticated(false);
      } finally {
        setIsAuthenticateLoading(false);
      }
    };

    initialize();
  }, [queryClient]);

  const isLoading = isAuthenticateLoading || isUserProfileLoading || isUserProfileFetching;

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  if (isAuthenticated && userProfile) {
    return (
      <Redirect href={userProfile?.isOnBoarded ? "/(protected)" : "/(protected)/onboarding"} />
    );
  }

  return <Redirect href={"/(auth)/onboarding"} />;
}
