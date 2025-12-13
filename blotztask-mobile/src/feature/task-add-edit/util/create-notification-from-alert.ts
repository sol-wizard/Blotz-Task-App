import { NotificationTaskDTO } from "@/shared/models/notification-task-dto";
import { scheduleTaskReminder } from "@/shared/util/schedule-task-reminder";

export async function createNotificationFromAlert({
  startTime,
  alert,
  title,
}: {
  startTime?: Date | null;
  alert?: number | null;
  title: string;
}) {
  if (!startTime || alert == null) {
    return null;
  }
  const notificationTime = new Date(startTime.getTime() - alert * 1000);

  if (notificationTime <= new Date()) {
    return null;
  }

  const notificationTask: NotificationTaskDTO = {
    title: title,
    alertTime: notificationTime,
  };

  try {
    const notificationId = await scheduleTaskReminder(notificationTask);
    return notificationId;
  } catch {
    return null;
  }
}
