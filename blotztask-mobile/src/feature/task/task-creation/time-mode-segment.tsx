import { Text, Pressable } from "react-native";
export function TimeModeSegment({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        "flex-1 rounded-full px-4 py-2 items-center justify-center",
        active ? "bg-white shadow" : "bg-transparent",
      ].join(" ")}
    >
      <Text
        className={active ? "text-gray-900 font-semibold" : "text-gray-500"}
      >
        {label}
      </Text>
    </Pressable>
  );
}
