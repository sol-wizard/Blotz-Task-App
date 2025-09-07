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
    const merged = new Date(datePart);
    merged.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
    changeDateTime(merged);
  }, [datePart, timePart]);

  return (
    <View className="flex-col p-2">
      <DatePicker value={new Date(defaultValue)} onChange={setDatePart} />
      <TimePicker
        defaultValue={new Date(defaultValue)}
        onChange={setTimePart}
      />
    </View>
  );
};
