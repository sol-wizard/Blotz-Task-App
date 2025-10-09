import { isSameDay, isSameMinute } from "date-fns";

export const isMultiDay = (startDate: Date | null, endDate: Date | null) =>
  !!(startDate && endDate && !isSameDay(startDate, endDate));

export const isRangeTime = (startTime: Date | null, endTime: Date | null) =>
  !!(startTime && endTime && !isSameMinute(startTime, endTime));
