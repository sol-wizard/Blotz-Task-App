import { Pressable, View } from "react-native";

type ToggleSwitchProps = {
  value: boolean;
  onChange: () => void;
};

export function ToggleSwitch({ value, onChange }: ToggleSwitchProps) {
  return (
    <Pressable
      onPress={onChange}
      className={`w-12 h-7 rounded-full p-1 ${value ? "bg-highlight" : "bg-gray-300"}`}
    >
      <View className={`w-5 h-5 rounded-full bg-white ${value ? "self-end" : "self-start"}`} />
    </Pressable>
  );
}
