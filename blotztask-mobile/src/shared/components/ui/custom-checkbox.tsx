import { MaterialIcons } from "@expo/vector-icons";
import { Pressable } from "react-native";

export const CustomCheckbox = ({
  checked,
  onPress,
}: {
  checked: boolean;
  onPress: () => void;
}) => {
  return (
    <Pressable
      className={`w-8 h-8 rounded-[10px] border-[3px] mr-3 items-center justify-center ${
        checked
          ? "bg-neutral-300 border-neutral-300"
          : "bg-white border-gray-300"
      }`}
      onPress={onPress}
    >
      {checked && <MaterialIcons name="check" color={"white"} size={14} />}
    </Pressable>
  );
};
