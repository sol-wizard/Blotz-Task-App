import * as Notifications from "expo-notifications";
import { NotificationTaskDTO } from "../models/notification-task-dto";
import uuid from "react-native-uuid";

export async function scheduleTaskReminder(task: NotificationTaskDTO) {
  if (!task.alertTime) return;

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "⏰ Task Reminder",
      body: task.title,
      data: {
        id: uuid.v4().toString(),
      },
      categoryIdentifier: "task-reminder",
    },

    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(task.alertTime),
    },
  });

  return notificationId;
}
