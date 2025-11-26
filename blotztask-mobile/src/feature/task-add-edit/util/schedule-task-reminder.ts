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
      categoryIdentifier: "task-reminder",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
  console.log("Notification scheduled with ID:", notificationId);
  return notificationId;
}

export async function rescheduleTaskReminder(task: TaskDetailDTO): Promise<string | undefined> {
  if (!task.startTime) return undefined;
  const notificationId = "a1b90388-7a14-4de5-ad13-f2fa0e8220f6";
  if (notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (e) {
      console.warn("Failed to cancel old notification:", e);
    }
  }

  return scheduleTaskReminder(task);
}
