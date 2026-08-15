import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ASSETS } from "@/shared/constants/assets";
import { FormDivider } from "@/shared/components/form-divider";

type Props = {
  displayPeriod: string;
  // Defaults to the monthly letter label; weekly passes its own.
  letterLabel?: string;
};

export function LetterHeader({ displayPeriod, letterLabel }: Props) {
  const { t } = useTranslation("settings");

  return (
    <>
      <View className="flex-row items-center mb-6">
        <View className="w-10 h-10 rounded-full bg-[#F1FFD9] items-center justify-center">
          <ASSETS.whiteBun width={22} height={20} color="#9DDB22" />
        </View>

        <View className="ml-3">
          <Text className="text-[10px] font-baloo text-secondary/50 uppercase tracking-[2px]">
            {letterLabel ?? t("monthlyReview.letterLabel")}
          </Text>

          <Text className="text-sm font-balooBold text-secondary">{displayPeriod}</Text>
        </View>
      </View>
      <View className="mb-6">
        <FormDivider marginVertical={0} />
      </View>
    </>
  );
}
