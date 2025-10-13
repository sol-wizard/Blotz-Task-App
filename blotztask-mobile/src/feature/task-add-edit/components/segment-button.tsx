import { View } from "react-native";
import { SegmentedButtons } from "react-native-paper";
import { SegmentValue } from "../models/segment-value";

interface SegmentButtonProps {
  value: SegmentValue;
  setValue: (v: SegmentValue) => void;
}

export const SegmentButton: React.FC<SegmentButtonProps> = ({ value, setValue }) => {
  return (
    <View className="w-60 mb-6">
      <SegmentedButtons
        value={value}
        onValueChange={(v) => setValue(v as SegmentValue)}
        buttons={
          [
            { value: "reminder", label: "Reminder" },
            { value: "event", label: "Event" },
          ] as const
        }
        theme={{
          colors: { secondaryContainer: "#9AD513" },
        }}
      />
    </View>
  );
};
