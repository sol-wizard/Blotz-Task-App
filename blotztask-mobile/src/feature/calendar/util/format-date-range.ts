import { format } from "date-fns";

export const formatDateRange = ({
  startTime,
  endTime,
}: {
  startTime?: string;
  endTime?: string;
}) => {
  const formatToken = "dd/MM/yyyy";
  const hasStartTime = startTime && startTime !== null;
  const hasEndTime = endTime && endTime !== null;

  if (hasStartTime && hasEndTime) {
    return `${format(new Date(startTime), formatToken)} - ${format(new Date(endTime), formatToken)}`;
  } else if (hasStartTime && !hasEndTime) {
    return `${format(new Date(startTime), formatToken)} - ?`;
  } else if (!hasStartTime && hasEndTime) {
    return `? - ${format(new Date(endTime), formatToken)}`;
  } else {
    return "";
  }
};
