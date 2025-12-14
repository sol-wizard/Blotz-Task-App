import { MaterialIcons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import * as Haptics from "expo-haptics";

interface TaskCheckboxProps {
  checked: boolean;
  onPress: () => void;
  disabled?: boolean;
  haptic?: boolean;
  size?: number;
}

export const TaskCheckbox = ({
  checked,
  onPress,
  disabled = false,
  haptic = false,
  size=32,
}: TaskCheckboxProps) => {
  const handlePress = () => {
    if (disabled) return;

    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onPress();
  };

  return (
    <Pressable
      className={`mr-3 items-center justify-center border-[3px] 
        ${checked ? "bg-[#E3EFFE] border-[#E3EFFE]" : "bg-white border-gray-300"} 
        ${disabled ? "opacity-50" : ""}`}
      onPress={handlePress}
      style={{ width: size, height: size, borderRadius: size / 4 }}
      disabled={disabled}
    >
      {checked && <MaterialIcons name="check" size={20} color="#3D8DE0" />}
    </Pressable>
  );
};
