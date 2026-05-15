import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Props = {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  disableNext: boolean;
};

export function MonthSelector({ label, onPrev, onNext, disableNext }: Props) {
  return (
    <View className="bg-white rounded-full flex-row items-center justify-between px-2 py-2">
      <Pressable
        onPress={onPrev}
        className="w-10 h-10 rounded-full items-center justify-center"
        hitSlop={8}
      >
        <MaterialCommunityIcons name="chevron-left" size={24} color="#363853" />
      </Pressable>
      <Text className="text-base font-balooBold text-secondary">{label}</Text>
      <Pressable
        onPress={onNext}
        disabled={disableNext}
        className="w-10 h-10 rounded-full items-center justify-center"
        hitSlop={8}
      >
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={disableNext ? "#C7C9D6" : "#363853"}
        />
      </Pressable>
    </View>
  );
}
