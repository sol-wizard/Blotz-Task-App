import { isSameDay, isSameMinute } from "date-fns";

export const isMultiDay = (startDate: Date | null, endDate: Date | null) =>
  !!(startDate && endDate && !isSameDay(startDate, endDate));

export const isRangeTime = (startTime: Date | null, endTime: Date | null) =>
  !!(startTime && endTime && !isSameMinute(startTime, endTime));

export const isSingleDay = (startDate: Date | null, endDate: Date | null) =>
  !!(startDate && endDate && isSameDay(startDate, endDate));

export const isSingleTime = (startTime: Date | null, endTime: Date | null) =>
  !!(startTime && endTime && isSameMinute(startTime, endTime));
