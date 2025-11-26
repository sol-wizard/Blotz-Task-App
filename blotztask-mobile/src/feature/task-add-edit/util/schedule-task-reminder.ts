import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import * as Notifications from "expo-notifications";

export async function scheduleTaskReminder(task: TaskDetailDTO) {
  if (!task.startTime) return;
  const taskStartTime = new Date(task.startTime).getTime();

  const triggerTime = taskStartTime - 10 * 60 * 1000;

  if (triggerTime <= Date.now()) {
    console.log("Trigger time is in the past. No notification scheduled.");
    return;
  }

  const triggerDate = new Date(triggerTime);
  console.log("Scheduling notification for:", triggerDate);

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "⏰ Task Reminder",
      body: task.title,
      data: {
        taskId: task.id,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
  console.log("Notification scheduled with ID:", notificationId);
  return notificationId;
}
