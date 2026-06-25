import LoadingScreen from "@/shared/components/loading-screen";
import { ReturnButton } from "@/shared/components/return-button";
import { formatLocalizedDate } from "@/shared/util/localized-date-format";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBadgeDetailQuery } from "../hooks/useBadgeDetailQuery";

export default function BadgeDetailsScreen() {
  const { t } = useTranslation("badge");
  const params = useLocalSearchParams();
  const rawBadgeId = Array.isArray(params.badgeId) ? params.badgeId[0] : params.badgeId;
  const parsedBadgeId = typeof rawBadgeId === "string" ? Number(rawBadgeId) : NaN;
  const badgeId = Number.isFinite(parsedBadgeId) ? parsedBadgeId : null;
  const { badgeDetail, isBadgeDetailLoading, isBadgeDetailError } = useBadgeDetailQuery(badgeId);

  if (isBadgeDetailLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4FAF1]">
        <LoadingScreen />
      </SafeAreaView>
    );
  }

  if (isBadgeDetailError || !badgeDetail) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4FAF1] px-5">
        <View className="py-4">
          <ReturnButton />
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-2xl font-balooBold text-secondary text-center">
            {t("details.notFound")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4FAF1]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingBottom: 32 }}
      >
        <View className="py-4">
          <ReturnButton />
        </View>

        <View className="flex-1 items-center justify-center">
          <Image
            source={{ uri: badgeDetail.iconUrl }}
            style={{ width: 190, height: 190, marginBottom: 36 }}
            contentFit="contain"
          />

          <Text className="text-3xl font-balooBold text-secondary text-center mb-5">
            {badgeDetail.name}
          </Text>

          <Text className="text-lg font-baloo text-gray-500 text-center leading-7 mb-8">
            {badgeDetail.description}
          </Text>

          <View className="bg-lime-100 rounded-full px-5 py-2 mb-6">
            <Text className="text-base font-balooBold text-secondary text-center">
              {t("details.category", { category: badgeDetail.category })}
            </Text>
          </View>

          <Text className="text-base font-baloo text-gray-400 text-center">
            {t("obtainedOn", {
              date: formatLocalizedDate(badgeDetail.obtainedAt, "fullMonthDayYear"),
            })}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
