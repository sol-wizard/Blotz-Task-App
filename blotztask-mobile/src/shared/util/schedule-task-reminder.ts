import * as Notifications from "expo-notifications";
import { NotificationTaskDTO } from "../models/notification-task-dto";

export async function scheduleTaskReminder(task: NotificationTaskDTO) {
  if (!task.alertTime) return;

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "⏰ Task Reminder",
      body: task.title,
      categoryIdentifier: "task-reminder",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(task.alertTime),
    },
  });

  return notificationId;
}
