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
      onPress={handlePress}
      disabled={disabled}
      className={`
        mr-3 items-center justify-center
        rounded-[12px]
        w-7 h-7
        border-[2px]
        ${checked ? "bg-[#E3EFFE] border-[#C3D7FE]" : "bg-white border-[#DFE5F0]"}
        ${disabled ? "opacity-40" : ""}
      `}
    >
      {checked && (
        <View className="w-4 h-4 rounded-[8px] items-center justify-center bg-[#3D8DE0]">
          <MaterialIcons name="check" size={12} color="#FFFFFF" />
        </View>
      )}
    </Pressable>

  );
};
