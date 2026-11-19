import type { ComponentProps } from "react";
import { Text, View } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons/static";

export type CoachChipTone = "neutral" | "info" | "warning" | "success";

const tones: Record<CoachChipTone, { box: string; text: string; icon: string }> = {
  neutral: { box: "bg-[#F3F5F7]", text: "text-[#6B7280]", icon: "#6B7280" },
  info: { box: "bg-[#EAF3FC]", text: "text-info", icon: "#3D8DE0" },
  warning: { box: "bg-[#FFF7ED]", text: "text-[#C2410C]", icon: "#C2410C" },
  success: { box: "bg-[#F1F9E1]", text: "text-[#5E8A00]", icon: "#5E8A00" },
};

/** Small metadata pill shared by draft cards and the review list (time, repeat, conflict). */
export function CoachChip({ label, tone = "neutral", icon }: {
  label: string;
  tone?: CoachChipTone;
  icon?: ComponentProps<typeof Ionicons>["name"];
}) {
  const style = tones[tone];
  return (
    <View className={`flex-row items-center gap-1 rounded-lg px-2 py-0.5 ${style.box}`}>
      {icon && <Ionicons name={icon} size={11} color={style.icon} />}
      <Text className={`font-inter text-xs font-medium ${style.text}`} numberOfLines={1}>{label}</Text>
    </View>
  );
}
