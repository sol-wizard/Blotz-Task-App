import { BadgeNotificationDTO } from "@/feature/badge/models/badge-notification-dto";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function useBadgeQueue() {
  const [badgeQueue, setBadgeQueue] = useState<BadgeNotificationDTO[]>([]);

  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      if (data?.type !== "badge") return;

      const earnedAtUtc = getString(data.earnedAtUtc);

      setBadgeQueue((prev) => [
        ...prev,
        {
          badgeId: Number(data.badgeId),
          name: notification.request.content.body ?? "",
          description: getString(data.description) ?? "",
          iconUrl: getString(data.iconUrl) ?? "",
          obtainedAt: earnedAtUtc ? new Date(earnedAtUtc) : new Date(),
        },
      ]);
    });

    return () => {
      notificationListener.remove();
    };
  }, []);

  const dismissBadge = () => setBadgeQueue((prev) => prev.slice(1));

  return { currentBadge: badgeQueue[0], dismissBadge };
}
