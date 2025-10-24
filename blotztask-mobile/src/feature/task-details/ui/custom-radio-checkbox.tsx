import { View, Pressable } from "react-native";
import { theme } from "@/shared/constants/theme";

type SubtaskCheckboxProps = {
  checked: boolean;
  onPress: () => void;
  color?: string;
};

export const SubtaskCheckbox = ({ checked, onPress, color = theme.colors.disabled }: SubtaskCheckboxProps) => {
  return (
    <Pressable
      className="w-6 h-6 rounded-full border-2 mr-4 items-center justify-center"
      style={{
        borderColor: checked ? color : theme.colors.disabled,
      }}
      onPress={onPress}
    >
      {checked && (
        <View
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
    </Pressable>
  );
};
