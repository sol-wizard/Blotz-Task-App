import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";

type TaskCheckboxVariant = "default" | "calendar";

interface TaskCheckboxProps {
  checked: boolean;
  onPress: () => void;
  disabled?: boolean;
  haptic?: boolean;
  variant?: TaskCheckboxVariant;
}

export const TaskCheckbox = ({
  checked,
  onPress,
  disabled = false,
  haptic = false,
  variant = "default",
}: TaskCheckboxProps) => {
  const handlePress = () => {
    if (disabled) return;

    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onPress();
  };

  const baseClasses = "w-8 h-8 rounded-[10px] mr-3 items-center justify-center border-[3px]";

  if (variant === "calendar") {
    const calendarStyle: ViewStyle = {
      backgroundColor: checked ? "#E3EFFE" : "#FFFFFF",
      borderColor: checked ? "#E3EFFE" : "#D1D5DB",
      opacity: disabled ? 0.5 : 1,
    };

    return (
      <Pressable
        className={baseClasses}
        style={calendarStyle}
        onPress={handlePress}
        disabled={disabled}
      >
        {checked && <MaterialIcons name="check" size={20} color="#3D8DE0" />}
      </Pressable>
    );
  }

  return (
    <Pressable
      className={`${baseClasses} ${
        checked ? "bg-neutral-300 border-neutral-300" : "bg-white border-gray-300"
      } ${disabled ? "opacity-50" : ""}`}
      onPress={handlePress}
      disabled={disabled}
    >
      {checked && <MaterialIcons name="check" color={"white"} size={14} />}
    </Pressable>
  );
};
