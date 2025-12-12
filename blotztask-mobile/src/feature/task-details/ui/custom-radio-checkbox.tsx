import { MaterialIcons } from "@expo/vector-icons";
import { View, Pressable } from "react-native";
import { theme } from "@/shared/constants/theme";
import * as Haptics from "expo-haptics";

type SubtaskCheckboxProps = {
  // checked: boolean;
  // onPress: () => void;
  // color?: string;
  checked: boolean;
  onPress: () => void;
  disabled?: boolean;
  haptic?: boolean;
};

export const SubtaskCheckbox = ({ 
  checked,
  onPress,
  disabled = false,
  haptic = false, 
  }: SubtaskCheckboxProps) => {const handlePress = () => {
      if (disabled) return;
  
      if (haptic) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
  
      onPress();
    };
  return (
    <Pressable
      className={`w-7 h-7 rounded-[8px] mr-3 items-center justify-center border-[3px] 
        ${checked ? "bg-[#E3EFFE] border-[#E3EFFE]" : "bg-white border-gray-300"} 
        ${disabled ? "opacity-50" : ""}`}
      // style={{
      //   borderColor: checked ? color : theme.colors.disabled,
      // }}
      onPress={handlePress}
      disabled={disabled}
    >
      {checked && (
        <MaterialIcons name="check" size={16} color="#3D8DE0" />
      )}
    </Pressable>
  );
};
