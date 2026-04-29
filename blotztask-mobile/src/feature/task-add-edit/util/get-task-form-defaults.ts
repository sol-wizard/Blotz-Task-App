import type { TaskUpsertDTO } from "@/shared/models/task-upsert-dto";
import type { TaskFormField } from "../models/task-form-schema";
import type { SegmentButtonValue } from "../models/segment-button-value";
import { calculateAlertSeconds } from "./time-convertion";

type GetTaskFormDefaultsParams = {
  mode: "create" | "edit";
  dto?: TaskUpsertDTO;
  upcomingNotification?: boolean;
};

type TaskFormDefaults = {
  initialTab: SegmentButtonValue;
  defaultValues: TaskFormField;
};

export const getTaskFormDefaults = ({
  mode,
  dto,
  upcomingNotification,
}: GetTaskFormDefaultsParams): TaskFormDefaults => {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 3600000);
  const dtoStartTime = dto?.startTime ? new Date(dto.startTime) : now;
  const dtoEndTime = dto?.endTime ? new Date(dto.endTime) : oneHourLater;
  const dueAt = dto?.dueAt ? new Date(dto.dueAt) : null;

  const hasEventTimes =
    dto?.timeType === 1 || (dto?.startTime && dto?.endTime && dto.startTime !== dto.endTime);
  const initialTab: SegmentButtonValue = mode === "edit" && hasEventTimes ? "event" : "reminder";
  const initialAlert = calculateAlertSeconds(dto?.startTime, dto?.alertTime);
  const defaultAlert = initialAlert ?? (upcomingNotification ? 300 : null);

  return {
    initialTab,
    defaultValues: {
      title: dto?.title ?? "",
      description: dto?.description ?? "",
      labelId: dto?.labelId ?? null,
      startDate: dtoStartTime,
      startTime: dtoStartTime,
      endDate: initialTab === "reminder" ? dtoStartTime : dtoEndTime,
      endTime: initialTab === "reminder" ? dtoStartTime : dtoEndTime,
      alert: defaultAlert,
      isDeadline: dto?.isDeadline ?? !!dueAt,
      deadlineDate: dueAt ?? oneHourLater,
      deadlineTime: dueAt ?? oneHourLater,
    },
  };
};
