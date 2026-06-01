import { useState, useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { CustomSpinner } from "@/shared/components/custom-spinner";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";
import { addMonths, isSameMonth, startOfMonth } from "date-fns";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { LetterBody } from "../components/letter-body";
import { LetterEmptyState } from "../components/letter-empty-state";
import { LetterHeader } from "../components/letter-header";
import { LetterSignature } from "../components/letter-signature";
import { MonthSelector } from "../components/month-selector";
import { useMonthlyReport } from "../hooks/useMonthlyReport";
import { useMonthlyReviewShare } from "../hooks/useMonthlyReviewShare";
import { formatMonth } from "../utils/month-utils";

export default function MonthlyReviewScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation("settings");
  const { userProfile } = useUserProfile();
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => startOfMonth(new Date()));
  const shareCardRef = useRef<View>(null);
  const { isSharingImage, shareImage } = useMonthlyReviewShare({
    captureTargetRef: shareCardRef,
  });
  const isAtCurrentMonth = isSameMonth(selectedMonth, new Date());
  const { report, isLoading, generate, isGenerating } = useMonthlyReport(selectedMonth);

  const displayMonth = formatMonth(selectedMonth, i18n.language);
  const recipientName = userProfile?.displayName ?? "Friend";

  const handleShareMonthlyReview = () => {
    if (!report || isSharingImage) {
      return;
    }

    void shareImage();
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 py-4">
        <Pressable onPress={() => router.back()} className="mr-4">
          <MaterialCommunityIcons name="arrow-left" size={24} color="#363853" />
        </Pressable>
        <Text className="flex-1 text-2xl font-balooBold text-secondary">
          {t("monthlyReview.title")}
        </Text>
        {report && (
          <Pressable
            onPress={handleShareMonthlyReview}
            disabled={isSharingImage}
            className={`h-10 flex-row items-center justify-center rounded-full bg-white px-3 ${
              isSharingImage ? "opacity-60" : "opacity-100"
            }`}
          >
            <MaterialCommunityIcons name="share-outline" size={18} color="#363853" />

            <Text className="ml-1 text-sm font-balooBold text-secondary">
              {isSharingImage ? t("monthlyReview.sharing") : t("monthlyReview.share")}
            </Text>
          </Pressable>
        )}
      </View>
      <View className="px-5 mb-4">
        <MonthSelector
          label={displayMonth}
          onPrev={() => setSelectedMonth((m) => addMonths(m, -1))}
          onNext={() => {
            if (!isAtCurrentMonth) setSelectedMonth((m) => addMonths(m, 1));
          }}
          disableNext={isAtCurrentMonth}
        />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View className="px-5">
          <View
            ref={shareCardRef}
            collapsable={false}
            className="rounded-3xl bg-[#FFFBF3] px-7 pt-7 pb-8"
          >
            <LetterHeader displayMonth={displayMonth} />
            {isLoading ? (
              // TODO: replace with a shared inline loading component once one exists.
              <View className="py-12 items-center">
                <CustomSpinner size={48} />
                <Text className="text-base font-baloo text-secondary/60 mt-3 text-center">
                  {t("monthlyReview.loading")}
                </Text>
              </View>
            ) : report ? (
              <>
                <LetterBody recipientName={recipientName} body={report.aiGeneratedLetter} />
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
