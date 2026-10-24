import { TaskUpsertDTO } from "@/shared/models/task-upsert-dto";
import { cancelNotification } from "@/shared/util/cancel-notification";
import * as Notifications from "expo-notifications";

export const getTaskNotification = async ({
  mode,
  dto,
  upcomingNotification,
  newAlertTime,
  newTaskTitle,
}: {
  mode: "create" | "edit";
  dto?: TaskUpsertDTO;
  upcomingNotification?: boolean;
  newAlertTime: Date | null;
  newTaskTitle: string;
}): Promise<string | null> => {
  // Replace the old scheduled notification before creating a new one during edits.
  if (mode === "edit" && dto?.alertTime && new Date(dto.alertTime) > new Date()) {
    await cancelNotification({
      notificationId: dto.notificationId,
    });
  }

  if (!upcomingNotification || !newAlertTime || newAlertTime <= new Date()) {
    return null;
  }

  return scheduleTaskReminder({ newTaskTitle, alertTime: newAlertTime });
};

async function scheduleTaskReminder({
  newTaskTitle,
  alertTime,
}: {
  newTaskTitle: string;
  alertTime: Date;
}): Promise<string | null> {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: "⏰ Task Reminder",
        body: newTaskTitle,
        categoryIdentifier: "task-reminder",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: alertTime,
      },
    });
  } catch {
    return null;
  }
}
