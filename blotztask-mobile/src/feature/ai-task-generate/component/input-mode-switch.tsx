import React from "react";
import { View } from "react-native";
import { IconButton } from "react-native-paper";

export function InputModeSwitch({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View className="bg-blue-50 rounded-full flex-row">
      <IconButton
        icon={value ? "microphone" : "microphone-outline"}
        size={20}
        onPress={() => onChange(true)}
        style={{ width: 32, height: 32, borderRadius: 9999 }}
        className={value ? "bg-black" : "bg-blue-100"}
        iconColor={value ? "white" : "#93C5FD"}
        accessibilityRole="button"
        accessibilityState={{ selected: value }}
      />

      <IconButton
        icon="pencil-outline"
        size={20}
        onPress={() => onChange(false)}
        style={{ width: 32, height: 32, borderRadius: 9999 }}
        className={value ? "bg-blue-100" : "bg-black"}
        iconColor={value ? "#93C5FD" : "white"}
        accessibilityRole="button"
        accessibilityState={{ selected: !value }}
      />
    </View>
  );
}
