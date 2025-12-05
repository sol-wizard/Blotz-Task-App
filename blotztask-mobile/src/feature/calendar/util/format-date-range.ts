import { format } from "date-fns";

export const formatDateRange = ({
  startTime,
  endTime,
}: {
  startTime?: string;
  endTime?: string;
}) => {
  const formatToken = "dd/MM/yyyy";
  const todayStr = format(new Date(), formatToken);

  if (startTime && endTime && startTime === endTime) {
    const singleDate = format(new Date(startTime), formatToken);
    return singleDate === todayStr ? "" : singleDate;
  } else if (startTime && endTime && startTime !== endTime) {
    return `${format(new Date(startTime), formatToken)} - ${format(new Date(endTime), formatToken)}`;
  } else if (!startTime || !endTime) {
    return "";
  }
};
