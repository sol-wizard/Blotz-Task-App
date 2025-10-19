import { format } from "date-fns";
import { en } from "zod/v4/locales";

export const formatDateRange = ({
  startTime,
  endTime,
}: {
  startTime?: string;
  endTime?: string;
}) => {
  const formatToken = "dd/MM/yyyy";

  if (startTime && endTime && startTime === endTime) {
    return `${format(new Date(startTime), formatToken)}`;
  } else if (startTime && endTime && startTime !== endTime) {
    return `${format(new Date(startTime), formatToken)} - ${format(new Date(endTime), formatToken)}`;
  } else if (!startTime || !endTime) {
    return "";
  }
};
