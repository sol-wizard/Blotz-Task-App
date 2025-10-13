import { View } from "react-native";
import { SegmentedButtons } from "react-native-paper";

interface SegmentButtonProps {
  value: string;
  setValue: (newValue: string) => void;
}

export const SegmentButton: React.FC<SegmentButtonProps> = ({ value, setValue }) => {
  return (
    <View className="w-60 mb-6">
      <SegmentedButtons
        value={value}
        onValueChange={setValue}
        buttons={[
          { value: "reminder", label: "Reminder" },
          { value: "event", label: "Event" },
        ]}
        theme={{
          colors: {
            secondaryContainer: "#9AD513",
          },
        }}
      />
    </View>
  );
};
