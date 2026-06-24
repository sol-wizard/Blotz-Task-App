import { BadgeNotificationDTO } from "@/feature/badge/models/badge-notification-dto";
import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
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

      const earnedAtUtc = typeof data.earnedAtUtc === "string" ? data.earnedAtUtc : undefined;

      setBadgeQueue((prev) => [
        ...prev,
        {
          badgeId: Number(data.badgeId),
          name: notification.request.content.body ?? "",
          description: typeof data.description === "string" ? data.description : "",
          iconUrl: typeof data.iconUrl === "string" ? data.iconUrl : "",
          obtainedAt: earnedAtUtc ? new Date(earnedAtUtc) : new Date(),
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
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  const dismissBadge = () => setBadgeQueue((prev) => prev.slice(1));

  const enqueueTestBadge = (badge: BadgeNotificationDTO) => {
    setBadgeQueue((prev) => [...prev, badge]);
  };

  return { badgeQueue, dismissBadge, enqueueTestBadge };
}
