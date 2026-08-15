import { Pressable, View, Text } from "react-native";
import { useRouter } from "expo-router";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { differenceInCalendarDays, endOfMonth } from "date-fns";
import { useTranslation } from "react-i18next";
import { formatLocalizedDate } from "@/shared/util/localized-date-format";

export function MonthlyLetterInProgressState() {
  const router = useRouter();

  const today = new Date();

  const arrivalDate = endOfMonth(today);

  const daysToGo = differenceInCalendarDays(arrivalDate, today);

  const arrivalLabel = formatLocalizedDate(arrivalDate, "abbrevMonthDay");
  const { t } = useTranslation("settings");

  return (
    <View className="items-center pt-8 pb-4">
      <MaterialCommunityIcons name="email-outline" size={32} color="#9AD513" />
      <Text className="mt-4 text-center text-base font-balooBold text-secondary">
        {t("monthlyReview.inProgressTitle")}
      </Text>

      <Text className="mt-1 text-center text-sm font-baloo text-secondary/50">
        {t("monthlyReview.inProgressArrival", {
          date: arrivalLabel,
          days: daysToGo,
        })}
      </Text>

      <Pressable
        onPress={() => router.push("/task-create")}
        className="mt-6 rounded-full bg-highlight px-6 py-3"
      >
        <Text className="font-balooBold text-white">{t("monthlyReview.recordToday")}</Text>
      </Pressable>
    </View>
  );
}
