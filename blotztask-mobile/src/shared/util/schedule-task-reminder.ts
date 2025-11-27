import * as Notifications from "expo-notifications";
import { NotificationTaskDTO } from "../models/notification-task-dto";

export async function scheduleTaskReminder(task: NotificationTaskDTO) {
  if (!task.startTime) return;
  const taskStartTime = new Date(task.startTime).getTime();

  const triggerTime = taskStartTime - 10 * 60 * 1000;

  if (triggerTime <= Date.now()) return;

  const triggerDate = new Date(triggerTime);

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "⏰ Task Reminder",
      body: task.title,
      data: {
        taskId: task.id,
      },
      categoryIdentifier: "task-reminder",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  return notificationId;
}
