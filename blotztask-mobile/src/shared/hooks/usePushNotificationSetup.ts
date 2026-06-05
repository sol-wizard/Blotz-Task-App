import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import { BadgeNotificationDTO } from "@/feature/badge/models/badge-notification-dto";
import { registerForPushNotificationsAsync } from "@/shared/services/notifications";
import { useRouter } from "expo-router";
import { toggleTaskCompletion } from "../services/task-service";

export function usePushNotificationSetup() {
  const router = useRouter();
  const [badgeQueue, setBadgeQueue] = useState<BadgeNotificationDTO[]>([]);

  useEffect(() => {
    registerForPushNotificationsAsync();

    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      if (data?.type !== "badge") return;

      setBadgeQueue((prev) => [
        ...prev,
        {
          badgeId: Number(data.badgeId),
          name: notification.request.content.body ?? "",
          description: (data.description as string) ?? "",
          iconUrl: data.iconUrl as string,
          obtainedAt: data.earnedAtUtc ? new Date(data.earnedAtUtc as string) : new Date(),
        },
      ]);
    });

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
      notificationListener.remove();
    };
  }, []);

  const dismissBadge = () => setBadgeQueue((prev) => prev.slice(1));

  return { badgeQueue, dismissBadge };
}
