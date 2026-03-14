import React from "react";
import { Pressable, ViewStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "@/shared/constants/theme";

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void | Promise<void>;
  disabled?: boolean;
  size?: number;
  color?: string;
  uncheckedColor?: string;
  className?: string;
  style?: ViewStyle;
};

const GREEN = theme.colors.checked;
const GRAY = theme.colors.disabled;

export default function TasksCheckbox({
  checked,
  onChange,
  disabled = false,
  size = 24,
  color = GREEN,
  uncheckedColor = GRAY,
  className = "",
  style,
}: Props) {
  const handlePress = async () => {
    if (disabled) return;
    await onChange(!checked);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      className={["items-center justify-center", disabled ? "opacity-50" : "", className].join(" ")}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: checked ? color : uncheckedColor,
          backgroundColor: "#FFFFFF",
        },
        style,
      ]}
    >
      {checked && <MaterialIcons name="check" size={Math.round(size * 0.6)} color={color} />}
    </Pressable>
  );
}
