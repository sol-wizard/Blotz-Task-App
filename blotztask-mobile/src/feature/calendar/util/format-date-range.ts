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
  const formatToken = "dd/MM/yyyy";
  const selectedDate = selectedDay ?? new Date();

  if (startTime === endTime) {
    const singleDate = new Date(startTime);
    if (isSameDay(singleDate, selectedDate)) return "";
    return format(singleDate, formatToken);
  }
  return `${format(new Date(startTime), formatToken)} - ${format(new Date(endTime), formatToken)}`;
};
