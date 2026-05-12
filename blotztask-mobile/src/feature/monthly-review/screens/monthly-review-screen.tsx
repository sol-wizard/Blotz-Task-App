import { Pressable, ScrollView, Text, View } from "react-native";
import { CustomSpinner } from "@/shared/components/custom-spinner";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { LetterBody } from "../components/letter-body";
import { LetterEmptyState } from "../components/letter-empty-state";
import { LetterHeader } from "../components/letter-header";
import { LetterSignature } from "../components/letter-signature";
import { MonthSelector } from "../components/month-selector";
import { useMonthlyReport } from "../hooks/useMonthlyReport";
import { formatMonth } from "../utils/month-utils";

export default function MonthlyReviewScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation("settings");
  const { userProfile } = useUserProfile();
  const {
    selectedMonth,
    report,
    isLoading,
    isError,
    refetch,
    isAtCurrentMonth,
    goPrev,
    goNext,
    generate,
    isGenerating,
  } = useMonthlyReport();

  const displayMonth = formatMonth(selectedMonth, i18n.language);
  const recipientName = userProfile?.displayName ?? "Friend";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 py-4">
        <Pressable onPress={() => router.back()} className="mr-4">
          <MaterialCommunityIcons name="arrow-left" size={24} color="#363853" />
        </Pressable>
        <Text className="text-2xl font-balooBold text-secondary">
          {t("monthlyReview.title")}
        </Text>
      </View>

      <View className="px-5 mb-4">
        <MonthSelector
          label={displayMonth}
          onPrev={goPrev}
          onNext={goNext}
          disableNext={isAtCurrentMonth}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View className="px-5">
          <View className="rounded-3xl px-7 pt-7 pb-8" style={{ backgroundColor: "#FFFBF3" }}>
            <LetterHeader displayMonth={displayMonth} />
            {isLoading ? (
              // TODO: replace with a shared inline loading component once one exists.
              <View className="py-12 items-center">
                <CustomSpinner size={48} />
                <Text className="text-base font-baloo text-secondary/60 mt-3 text-center">
                  {t("monthlyReview.loading")}
                </Text>
              </View>
            ) : isError ? (
              <View className="py-12 items-center">
                <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#C7C9D6" />
                <Text className="text-base font-baloo text-secondary/60 mt-3 text-center">
                  {t("monthlyReview.error")}
                </Text>
                <Pressable
                  onPress={() => refetch()}
                  className="mt-4 px-5 py-2 rounded-full bg-secondary"
                >
                  <Text className="text-white font-balooBold">
                    {t("monthlyReview.retry")}
                  </Text>
                </Pressable>
              </View>
            ) : report ? (
              <>
                <LetterBody
                  recipientName={recipientName}
                  body={report.aiGeneratedLetter}
                />
                <LetterSignature />
              </>
            ) : (
              <>
                <LetterEmptyState />
                {/* TODO: temporary test button — remove once PBI 8A scheduled trigger is in place. */}
                <View className="items-center mb-6">
                  <Pressable
                    onPress={() => generate()}
                    disabled={isGenerating}
                    className="px-5 py-2 rounded-full bg-secondary"
                    style={{ opacity: isGenerating ? 0.6 : 1 }}
                  >
                    <Text className="text-white font-balooBold">
                      {isGenerating ? t("monthlyReview.loading") : t("monthlyReview.generate")}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>

          <Text className="text-xs font-baloo text-secondary/50 text-center mt-8 px-4">
            {t("monthlyReview.footnote")}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
