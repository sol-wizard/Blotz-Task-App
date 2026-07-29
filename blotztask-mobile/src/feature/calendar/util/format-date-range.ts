import { format, isSameDay } from "date-fns";

export const formatDateRange = ({
  startTime,
  endTime,
  selectedDay,
}: {
  startTime: string;
  endTime: string;
  selectedDay?: Date;
}) => {
  const formatToken = "dd/MM";
  const selectedDate = selectedDay ?? new Date();

  if (startTime === endTime) {
    const singleDate = new Date(startTime);
    if (isSameDay(singleDate, selectedDate)) return "";
    return format(singleDate, formatToken);
  }

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  if (isSameDay(startDate, endDate)) return format(startDate, formatToken);

  return `${format(startDate, formatToken)} - ${format(endDate, formatToken)}`;
};
