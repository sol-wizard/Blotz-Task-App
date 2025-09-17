import { View } from "react-native";
import DatePicker from "./date-picker";
import { TimePicker } from "./time-picker";
import { useEffect, useState } from "react";
import { applyCreateTaskTimes } from "@/feature/task/services/task-service";

export const DateTimeSelector = ({
  defaultValue,
  changeDateTime,
  defaultHours = 0,
  defaultMinutes = 0,
}: {
  defaultValue: Date;
  changeDateTime: (d: Date) => void;
  defaultHours?: number;
  defaultMinutes?: number;
}) => {
  const [datePart, setDatePart] = useState<Date>(defaultValue);
  const [timePart, setTimePart] = useState<Date>(defaultValue);

  useEffect(() => {
    if (!datePart) return;
    const merged = applyCreateTaskTimes(datePart, timePart, defaultHours, defaultMinutes);
    changeDateTime(merged);
  }, [datePart, timePart, changeDateTime, defaultHours, defaultMinutes]);

  return (
    <View className="flex-col p-2">
      <DatePicker value={defaultValue} onChange={setDatePart} />
      <TimePicker defaultValue={defaultValue} onChange={setTimePart} />
    </View>
  );
};
