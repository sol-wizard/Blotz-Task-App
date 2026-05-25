import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { registerForPushNotificationsAsync } from "@/shared/services/notifications";
import { useRouter } from "expo-router";
import { toggleTaskCompletion } from "../services/task-service";

export function usePushNotificationSetup() {
  const router = useRouter();

  useEffect(() => {
    registerForPushNotificationsAsync();

    const responseListener = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const data = response.notification.request.content.data;
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

    return () => {
      responseListener.remove();
    };
  }, []);
}
