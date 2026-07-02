import { GradientColor } from "@/shared/components/gradient-color";
import LoadingScreen from "@/shared/components/loading-screen";
import { ReturnButton } from "@/shared/components/return-button";
import { formatLocalizedDate } from "@/shared/util/localized-date-format";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBadgeDetailQuery } from "../hooks/useBadgeDetailQuery";

export default function BadgeDetailsScreen() {
  const { t } = useTranslation("badge");
  const params = useLocalSearchParams<{ badgeId?: string }>();
  const badgeId = params.badgeId ? Number(params.badgeId) : null;
  const { badgeDetail, isBadgeDetailLoading, isBadgeDetailError } = useBadgeDetailQuery(badgeId);

  return (
    <SafeAreaView className="flex-1 bg-[#F5FAF8]">
      {isBadgeDetailLoading ? (
        <LoadingScreen />
      ) : isBadgeDetailError || !badgeDetail ? (
        <>
          <View className="px-5 py-4">
            <ReturnButton />
          </View>
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-2xl font-balooBold text-secondary text-center">
              {t("details.notFound")}
            </Text>
          </View>
        </>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="pt-4">
            <ReturnButton />
          </View>

          <View className="items-center pt-8">
            <GradientColor className="mb-14">
              <Text className="text-4xl font-balooExtraBold text-center leading-normal">
                {t("achievementUnlocked")}
              </Text>
            </GradientColor>

            <Image
              source={{ uri: badgeDetail.iconUrl }}
              style={{ width: 235, height: 235, marginBottom: 44 }}
              contentFit="contain"
            />

            <Text className="text-3xl font-balooExtraBold text-secondary text-center mb-4">
              {badgeDetail.name}
            </Text>

            <Text className="text-lg font-balooBold text-gray-500 text-center leading-8 mb-7">
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

          <View className="mt-8 flex-row items-center justify-center gap-4">
            <Pressable
              className="h-14 min-w-36 rounded-full border border-highlight bg-white/60 px-5 items-center justify-center"
              onPress={() => console.log("Equip reward", badgeDetail.id)}
            >
              <Text className="text-lg font-balooBold text-highlight">
                {t("details.equipReward")}
              </Text>
            </Pressable>

            <Pressable
              className="h-14 min-w-36 rounded-full bg-highlight px-5 items-center justify-center shadow-lg shadow-lime-300"
              onPress={() => console.log("Share reward", badgeDetail.id)}
            >
              <Text className="text-lg font-balooBold text-white">{t("shareReward")}</Text>
            </Pressable>
          </View>

          <Text className="mt-auto pt-16 text-center text-lg font-balooBold text-highlight">
            Blotz task
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
