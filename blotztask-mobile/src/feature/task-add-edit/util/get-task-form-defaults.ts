import { addHours } from "date-fns";
import type { TaskUpsertDTO } from "@/shared/models/task-upsert-dto";
import { SegmentButtonValue } from "../models/segment-button-value";
import type { TaskFormField } from "../models/task-form-schema";
import { calculateAlertSeconds } from "./time-convertion";
import { TaskTimeType } from "@/shared/models/base-task-dto";

type GetTaskFormDefaultsParams = {
  dto?: TaskUpsertDTO;
  allowNotification?: boolean;
};

type TaskFormDefaults = {
  initialTab: SegmentButtonValue;
  defaultValues: TaskFormField;
};

export const getTaskFormDefaults = ({
  dto,
  allowNotification,
}: GetTaskFormDefaultsParams): TaskFormDefaults => {
  const now = new Date();
  const oneHourLater = addHours(now, 1);
  const twoHoursLater = addHours(now, 2);

  // default values for creating a new task
  if (!dto) {
    return {
      initialTab: SegmentButtonValue.Reminder,
      defaultValues: {
        title: "",
        description: "",
        labelId: null,
        startDate: oneHourLater,
        startTime: oneHourLater,
        endDate: twoHoursLater,
        endTime: twoHoursLater,
        alert: allowNotification ? 300 : null,
        isDeadline: false,
        deadlineDate: null,
        deadlineTime: null,
      },
    };
  }

  const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
  const isEvent = dto.timeType === TaskTimeType.Range;

  const initialAlert = calculateAlertSeconds(dto.startTime, dto.alertTime);
  const defaultAlert = initialAlert ?? (allowNotification ? 300 : null);
  // default values for editing an existing task
  return {
    initialTab: isEvent ? SegmentButtonValue.Event : SegmentButtonValue.Reminder,
    defaultValues: {
      title: dto.title,
      description: dto.description ?? "",
      labelId: dto.labelId ?? null,
      startDate: new Date(dto.startTime),
      startTime: new Date(dto.startTime),
      endDate: new Date(dto.endTime),
      endTime: new Date(dto.endTime),
      alert: defaultAlert,
      isDeadline: dto.isDeadline,
      deadlineDate: dueAt,
      deadlineTime: dueAt,
    },
  };
};
