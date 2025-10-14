import { View, Pressable } from "react-native";
import { theme } from "@/shared/constants/theme";

type CustomRadioCheckboxProps = {
  checked: boolean;
  onPress: () => void;
  color?: string;
};

export const CustomRadioCheckbox = ({ checked, onPress, color }: CustomRadioCheckboxProps) => {
  const activeColor = color ?? theme.colors.disabled;

  return (
    <Pressable
      className="w-8 h-8 rounded-full border-[3px] mr-3 items-center justify-center"
      style={{
        borderColor: checked ? activeColor : theme.colors.disabled,
      }}
      onPress={onPress}
    >
      {checked && (
        <View
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: activeColor }}
        />
      )}
    </Pressable>
  );
};
