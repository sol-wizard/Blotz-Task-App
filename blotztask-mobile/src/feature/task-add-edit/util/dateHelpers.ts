import { isSameDay } from "date-fns";

export const isMultiDay = (startDate: Date | null, endDate: Date | null) =>
  !!(startDate && endDate && !isSameDay(startDate, endDate));
