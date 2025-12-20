import { Pressable, View } from "react-native";

type ToggleSwitchProps = {
  value: boolean;
  onChange: () => void;
  disabled?: boolean;
};

export function ToggleSwitch({ value, onChange, disabled = false }: ToggleSwitchProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onChange}
      className={`w-12 h-7 rounded-full p-1 ${value ? "bg-highlight" : "bg-gray-300"} ${disabled ? "opacity-80" : ""}`}
    >
      <View
        className={`w-5 h-5 rounded-full bg-white ${value ? "self-end" : "self-start"} ${
          disabled ? "opacity-80" : ""
        }`}
      />
    </Pressable>
  );
}
