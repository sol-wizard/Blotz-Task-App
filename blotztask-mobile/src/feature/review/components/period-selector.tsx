import { Pressable, Text, View } from "react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
type Props = {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  disablePrev: boolean;
  disableNext: boolean;
};

export function PeriodSelector({ label, onPrev, onNext, disablePrev, disableNext }: Props) {
  return (
    <View className="bg-white rounded-full flex-row items-center justify-between px-2 py-2">
      <Pressable
        onPress={onPrev}
        disabled={disablePrev}
        className="w-10 h-10 rounded-full items-center justify-center"
        hitSlop={8}
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={24}
          color={disablePrev ? "#8C8C8C" : "#444964"}
        />
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
          color={disableNext ? "#8C8C8C" : "#444964"}
        />
      </Pressable>
    </View>
  );
}
