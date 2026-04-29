import { TaskUpsertDTO } from "@/shared/models/task-upsert-dto";
import type { TaskFormField } from "../models/task-form-schema";
import { cancelNotification } from "@/shared/util/cancel-notification";
import { calculateAlertTime } from "./time-convertion";
import * as Notifications from "expo-notifications";

type NotificationPayload = {
  alertTime: Date | null;
  notificationId: string | null;
};

export const getTaskNotification = async ({
  mode,
  dto,
  upcomingNotification,
  startTime,
  alert,
  title,
}: {
  mode: "create" | "edit";
  dto?: TaskUpsertDTO;
  upcomingNotification?: boolean;
  startTime: Date;
  alert: TaskFormField["alert"];
  title: string;
}): Promise<NotificationPayload> => {
  // Replace the old scheduled notification before creating a new one during edits.
  if (mode === "edit" && dto?.alertTime && new Date(dto.alertTime) > new Date()) {
    await cancelNotification({
      notificationId: dto.notificationId,
    });
  }

  if (!upcomingNotification) {
    return {
      notificationId: null,
      alertTime: null,
    };
  }

  const alertTime = calculateAlertTime(startTime, alert);

  if (!alertTime || alertTime <= new Date()) {
    return {
      notificationId: null,
      alertTime: null,
    };
  }

  const notificationId = await scheduleTaskReminder({
    title,
    alertTime,
  });

  return {
    notificationId,
    alertTime: notificationId ? alertTime : null,
  };
};

async function scheduleTaskReminder({
  title,
  alertTime,
}: {
  title: string;
  alertTime: Date;
}): Promise<string | null> {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: "⏰ Task Reminder",
        body: title,
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
