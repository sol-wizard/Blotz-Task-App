import { MaterialIcons } from "@expo/vector-icons";
import { View, Pressable } from "react-native";
import { theme } from "@/shared/constants/theme";
import * as Haptics from "expo-haptics";
import { backgroundColor } from "react-native-calendars/src/style";

type SubtaskCheckboxProps = {
  checked: boolean;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  haptic?: boolean;
};

export const SubtaskCheckbox = ({ 
  checked,
  onPress,
  disabled = false,
  haptic = false, 
  color = theme.colors.disabled
  }: SubtaskCheckboxProps) => {const handlePress = () => {
      if (disabled) return;
  
      if (haptic) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
  
      onPress();
    };
  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      className={`
        mr-3 items-center justify-center
        w-7 h-7
        rounded-md         
        border-[2px]
        ${checked ?  "bg-[#E3EFFE] border-[#E3EFFE]" : "bg-white border-gray-300"}
        ${disabled ? "opacity-50" : ""}
      `}
    >
      {checked && (
          <MaterialIcons name="check" size={16}  color="#3D8DE0" />
      )}
    </Pressable>


  );
};
