import * as Notifications from "expo-notifications";

const ALLOWED_REMINDER_SECONDS = [0, 300, 600, 1800, 3600, 7200, 86400];

export async function getNotificationTime(
  taskEndTime: Date,
  notificationId: string,
): Promise<number | null> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const target = all.find((n) => n.identifier === notificationId);

  if (!target || !target.trigger) return null;

  const triggerTimestamp = await Notifications.getNextTriggerDateAsync(
    target.trigger as Notifications.SchedulableNotificationTriggerInput,
  );

  if (triggerTimestamp == null) return null;

  const triggerDate = new Date(triggerTimestamp);

  const diffSeconds = Math.round((taskEndTime.getTime() - triggerDate.getTime()) / 1000);

  const matched = ALLOWED_REMINDER_SECONDS.find((v) => v === diffSeconds);

  return matched ?? null;
}
