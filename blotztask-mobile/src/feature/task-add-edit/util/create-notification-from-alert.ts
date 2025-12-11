import { NotificationTaskDTO } from "@/shared/models/notification-task-dto";
import TaskFormField from "../models/task-form-schema";
import { scheduleTaskReminder } from "@/shared/util/schedule-task-reminder";

export async function createNotificationFromAlert(taskData: TaskFormField) {
  if (!taskData.startTime || !taskData.alert) {
    return null;
  }
  const notificationTime = new Date(taskData.startTime.getTime() - taskData.alert * 1000);
  if (notificationTime <= new Date()) {
    return null;
  }

  const notificationTask: NotificationTaskDTO = {
    title: taskData.title,
    alertTime: notificationTime.toISOString(),
  };
  const notificationId = await scheduleTaskReminder(notificationTask);
  return notificationId;
}
