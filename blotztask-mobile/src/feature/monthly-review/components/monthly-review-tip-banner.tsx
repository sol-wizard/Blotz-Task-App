import { Pressable, Text, View } from "react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";

type Props = {
  text: string;
  onDismiss?: () => void;
};

export function MonthlyReviewTipBanner({ text, onDismiss }: Props) {
  return (
    <View className="mb-4 w-full flex-row items-start rounded-2xl border border-[#DCEFC9] bg-[#F2F9EA] px-3.5 py-3 shadow-sm shadow-black/[.03]">
      <View className="mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-[#DDF1CB]">
        <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color="#5FA836" />
      </View>

      <Text className="ml-2.5 flex-1 text-[13px] leading-5 font-baloo text-secondary/70">
        {text}
      </Text>

      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Dismiss tip"
          className="ml-2 h-6 w-6 items-center justify-center rounded-full"
        >
          <MaterialCommunityIcons name="close" size={15} color="#36385399" />
        </Pressable>
      ) : null}
    </View>
  );
}
