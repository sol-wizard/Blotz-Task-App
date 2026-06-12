import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "@/shared/components/user-avatar";

type Props = {
  displayPeriod: string;
  recipientName: string;
  pictureUrl: string | null | undefined;
  // Defaults to the monthly letter label; weekly passes its own.
  letterLabel?: string;
};

export function LetterHeader({ displayPeriod, recipientName, pictureUrl, letterLabel }: Props) {
  const { t } = useTranslation("settings");

  return (
    <>
      <View className="flex-row items-center justify-between mb-6">
        <View className="flex-row items-center">
          <View className="w-9 h-9 rounded-full items-center justify-center overflow-hidden bg-white shadow-sm shadow-black/[.08]">
            <UserAvatar pictureValue={pictureUrl} size={36} />
          </View>
          <View className="ml-3">
            <Text className="text-[10px] font-baloo text-secondary/50 uppercase tracking-[2px]">
              {letterLabel ?? t("monthlyReview.letterLabel")}
            </Text>
            <Text className="text-sm font-balooBold text-secondary">{recipientName}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-[10px] font-baloo text-secondary/50 uppercase tracking-[2px]">
            {t("monthlyReview.dateLabel")}
          </Text>
          <Text className="text-sm font-balooBold text-secondary">{displayPeriod}</Text>
        </View>
      </View>
      <View className="h-px bg-secondary/10 mb-6" />
    </>
  );
}
