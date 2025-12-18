export function convertDurationToText(timeStr: string): string {
  const [hours, minutes, seconds] = timeStr.split(":").map(Number);

  if (minutes === 0 && seconds === 0) {
    return `${hours}h`;
  } else if (hours === 0 && seconds === 0) {
    return `${minutes}min`;
  } else if (hours > 0 && minutes > 0 && seconds === 0) {
    return `${minutes}min`;
  } else {
    return `${hours > 0 ? hours + "h " : ""}${minutes > 0 ? minutes + "min" : ""}`;
  }
}

export const convertDurationToMinutes = (duration: string): number => {
  const [hours, minutes, seconds] = duration.split(":").map(Number);
  return hours * 60 + minutes + Math.ceil(seconds / 60);
};
