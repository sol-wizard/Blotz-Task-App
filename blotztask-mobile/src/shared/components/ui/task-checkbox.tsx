import { MaterialIcons } from "@expo/vector-icons";
import { Pressable } from "react-native";

interface TaskCheckboxProps {
  checked: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export const TaskCheckbox = ({ checked, onPress, disabled = false }: TaskCheckboxProps) => {
  return (
    <Pressable
      className={`w-8 h-8 rounded-[10px] border-[3px] mr-3 items-center justify-center ${
        checked ? "bg-neutral-300 border-neutral-300" : "bg-white border-gray-300"
      } ${disabled ? "opacity-50" : ""}`}
      onPress={onPress}
      disabled={disabled}
    >
      {checked && <MaterialIcons name="check" color={"white"} size={14} />}
    </Pressable>
  );
};
