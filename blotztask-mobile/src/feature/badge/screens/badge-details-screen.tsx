import LoadingScreen from "@/shared/components/loading-screen";
import { ReturnButton } from "@/shared/components/return-button";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBadgeDetailQuery } from "../hooks/useBadgeDetailQuery";
import { BadgeDetailContent } from "../components/badge-detail-content";

export default function BadgeDetailsScreen() {
  const { t } = useTranslation("badge");

  const params = useLocalSearchParams<{ badgeId: string }>();
  const badgeId = Number(params.badgeId);
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
        <>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingBottom: 28 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="pt-4">
              <ReturnButton />
            </View>

            <BadgeDetailContent badgeDetail={badgeDetail} />
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}
