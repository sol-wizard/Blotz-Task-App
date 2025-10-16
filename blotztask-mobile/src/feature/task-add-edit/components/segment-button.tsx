import { View } from "react-native";
import { SegmentedButtons } from "react-native-paper";
import { SegmentButtonValue } from "../models/segment-button-value";

interface SegmentButtonProps {
  value: SegmentButtonValue;
  setValue: (v: SegmentButtonValue) => void;
}

export const SegmentButton: React.FC<SegmentButtonProps> = ({ value, setValue }) => {
  return (
    <View className="w-60 mb-6">
      <SegmentedButtons
        value={value}
        onValueChange={(v) => setValue(v as SegmentButtonValue)}
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
