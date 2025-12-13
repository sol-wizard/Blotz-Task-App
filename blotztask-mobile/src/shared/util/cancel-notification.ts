import * as Notifications from "expo-notifications";

export const cancelNotification = async ({
  notificationId,
}: {
  notificationId?: string | null;
}) => {
  if (notificationId == null) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(String(notificationId));
  } catch (e) {
    console.log("Failed to cancel notification:", e);
  }

  return;
};
