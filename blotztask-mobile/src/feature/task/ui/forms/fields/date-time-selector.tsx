import { View } from "react-native";
import DatePicker from "./date-picker";
import { TimePicker } from "./time-picker";
import { useEffect, useState } from "react";

export const DateTimeSelector = ({
  defaultValue,
  changeDateTime,
}: {
  defaultValue: Date;
  changeDateTime: (d: Date) => void;
}) => {
  const [datePart, setDatePart] = useState<Date>(defaultValue);
  const [timePart, setTimePart] = useState<Date>(defaultValue);

  useEffect(() => {
    if (datePart) {
      const merged = new Date(datePart);
      if (timePart) {
        merged.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
      }
      changeDateTime(merged);
    }
    return;
  }, [datePart, timePart]);

  return (
    <View className="flex-col p-2">
      <DatePicker value={defaultValue} onChange={setDatePart} />
      <TimePicker defaultValue={defaultValue} onChange={setTimePart} />
    </View>
  );
};
