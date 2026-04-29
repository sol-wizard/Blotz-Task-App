import { TaskUpsertDTO } from "@/shared/models/task-upsert-dto";
import TaskFormField from "../models/task-form-schema";
import { cancelNotification } from "@/shared/util/cancel-notification";
import { calculateAlertTime } from "./time-convertion";
import { TaskFormProps } from "../task-form";
import * as Notifications from "expo-notifications";
import uuid from "react-native-uuid";

type NotificationPayload = {
  alertTime: Date | null;
  notificationId: string | null;
};
interface NotificationTaskDTO {
  title: string;
  alertTime: Date;
}

export const getTaskNotification = async ({
  mode,
  dto,
  upcomingNotification,
  startTime,
  alert,
  title,
}: {
  mode: TaskFormProps["mode"];
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

  const notificationId =
    (await createNotificationFromAlert({
      startTime,
      alert,
      title,
    })) ?? null;

  return {
    notificationId,
    alertTime: calculateAlertTime(startTime, alert),
  };
};

async function createNotificationFromAlert({
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

async function scheduleTaskReminder(task: NotificationTaskDTO) {
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
