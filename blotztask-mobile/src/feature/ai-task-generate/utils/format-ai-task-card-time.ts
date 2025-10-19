import { format, isSameDay, parseISO } from "date-fns";

export const formatAiTaskCardDate = ({
  startTime,
  endTime,
}: {
  startTime: string;
  endTime: string;
}) => {
  if (!startTime && !endTime) {
    return "Today";
  } else if (startTime && endTime && isSameDay(startTime, endTime)) {
    return `${format(parseISO(startTime), "dd MMM")}`;
  } else if (startTime && endTime && !isSameDay(startTime, endTime)) {
    return `${format(parseISO(startTime), "dd MMM")} - ${format(parseISO(endTime), "dd MMM")}`;
  }
};

export const formatAiTaskCardTime = ({
  startTime,
  endTime,
}: {
  startTime: string;
  endTime: string;
}) => {
  if (!startTime && !endTime) {
    return "";
  } else if (startTime && endTime && startTime === endTime) {
    return `${format(parseISO(startTime), "H:mm")}`;
  } else if (startTime && endTime && startTime !== endTime) {
    return `${format(parseISO(startTime), "H:mm")} - ${format(parseISO(endTime), "H:mm")}`;
  }
};
