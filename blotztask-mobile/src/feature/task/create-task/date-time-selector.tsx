import { View } from "react-native";
import DatePicker from "./date-picker";
import { TimeWheel } from "./time-wheel";

export const DateTimeSelector = ({
  defaultValue,
  changeDateTime,
}: {
  defaultValue: Date;
  changeDateTime: () => void;
}) => {
  console.log("DateTimeSelector - defaultValue:", defaultValue);
  return (
    <View className="flex-col p-2">
      <DatePicker value={new Date(defaultValue)} onChange={changeDateTime} />
      <TimeWheel
        defaultValue={new Date(defaultValue)}
        onChange={changeDateTime}
      />
    </View>
  );
};
