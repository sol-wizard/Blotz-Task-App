import * as Notifications from "expo-notifications";

export const cancelNotification = async ({
  notificationId,
  alertTime,
}: {
  notificationId?: string | null;
  alertTime?: string | null;
}) => {
  if (notificationId == null || alertTime == null) return;

  const alertMs = new Date(alertTime).getTime();

  if (alertMs >= Date.now()) {
    try {
      await Notifications.cancelScheduledNotificationAsync(String(notificationId));
    } catch (e) {
      console.log("Failed to cancel notification:", e);
    }
  }
  return;
};
