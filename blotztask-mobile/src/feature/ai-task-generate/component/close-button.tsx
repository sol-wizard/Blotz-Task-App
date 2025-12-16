import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type CloseButtonProps = {
  onPress?: () => void;
  size?: number;
  disabled?: boolean;
};

export const CloseButton = ({ onPress, size = 30, disabled = false }: CloseButtonProps) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="rounded-full items-center justify-center bg-[#f4f7f9]"
      style={{ width: size, height: size, opacity: disabled ? 0.6 : 1 }}
    >
      <Ionicons name="close" size={17} color="#9ca3af" />
    </Pressable>
  );
};
