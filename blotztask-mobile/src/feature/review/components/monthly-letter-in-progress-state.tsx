import { Pressable, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { addMonths, differenceInCalendarDays, startOfMonth } from "date-fns";
import { useTranslation } from "react-i18next";
import { formatLocalizedDate } from "@/shared/util/localized-date-format";
import { Image } from "expo-image";
import { PNGIMAGES } from "@/shared/constants/assets";

export function MonthlyLetterInProgressState() {
  const router = useRouter();

  const today = new Date();

  const arrivalDate = startOfMonth(addMonths(today, 1));

  const { t } = useTranslation("settings");

  return (
    <View className="items-center pt-4 pb-4">
      <Image
        source={PNGIMAGES.letterEnvelope}
        style={{ width: 72, height: 72 }}
        contentFit="contain"
      />
      <Text className="mt-4 text-center text-base font-balooBold text-secondary">
        {t("monthlyReview.inProgressTitle")}
      </Text>

      <Text className="mt-1 text-center text-sm font-baloo text-secondary/50">
        {t("monthlyReview.inProgressArrival", {
          date: formatLocalizedDate(arrivalDate, "abbrevMonthDay"),
          days: differenceInCalendarDays(arrivalDate, today),
        })}
      </Text>

      <Pressable
        onPress={() => router.push("/task-create")}
        className="mt-8 rounded-full bg-highlight px-6 py-3"
      >
        <Text className="font-balooBold text-white">{t("monthlyReview.recordToday")}</Text>
      </Pressable>
      <Image
        source={PNGIMAGES.letterStamp}
        style={{
          position: "absolute",
          width: 300,
          height: 360,
          right: -70,
          bottom: -140,
        }}
        contentFit="contain"
      />
    </View>
  );
}
