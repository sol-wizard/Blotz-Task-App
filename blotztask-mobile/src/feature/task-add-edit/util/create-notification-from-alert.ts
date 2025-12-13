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
    console.log("no starttime or no alert");
    return null;
  }
  const notificationTime = new Date(startTime.getTime() - alert * 1000);
  console.log("notificationTime:", notificationTime.toLocaleString());
  if (notificationTime <= new Date()) {
    console.log("notificationTime <= new Date()");
    return null;
  }

  const notificationTask: NotificationTaskDTO = {
    title: title,
    alertTime: notificationTime,
  };
  console.log("Scheduling notification with data:", notificationTask);
  try {
    const notificationId = await scheduleTaskReminder(notificationTask);
    return notificationId;
  } catch {
    return null;
  }
}
