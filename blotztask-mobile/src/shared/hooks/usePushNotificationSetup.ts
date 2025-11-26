import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { registerForPushNotificationsAsync } from "@/shared/services/notifications";
import { useRouter } from "expo-router";
import { toggleTaskCompletion } from "../services/task-service";

export function usePushNotificationSetup() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [channels, setChannels] = useState<Notifications.NotificationChannel[]>([]);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Register notification permissions & get token
    registerForPushNotificationsAsync().then((token) => {
      if (token) setExpoPushToken(token);
    });

    // Get Notification Channel for Android
    if (Platform.OS === "android") {
      Notifications.getNotificationChannelsAsync().then((value) => setChannels(value ?? []));
    }

    // Register notification listeners
    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const data = response.notification.request.content.data as any;
        const taskId = data?.taskId as string | undefined;

        if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          router.push("/(protected)");
          return;
        }

        if (response.actionIdentifier === "MARK_DONE") {
          if (taskId) {
            await toggleTaskCompletion(Number(taskId));
          }
        }
      },
    );

    // Cleanup listeners on unmount
    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  return {
    expoPushToken,
    channels,
    notification,
  };
}
