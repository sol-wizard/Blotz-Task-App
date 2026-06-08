import { useState, useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { CustomSpinner } from "@/shared/components/custom-spinner";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";
import { addMonths, isAfter, isSameMonth, startOfMonth, subMonths } from "date-fns";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { LetterBody } from "../components/letter-body";
import { LetterEmptyState } from "../components/letter-empty-state";
import { LetterHeader } from "../components/letter-header";
import { LetterSignature } from "../components/letter-signature";
import { MonthSelector } from "../components/month-selector";
import { MonthlyReviewTipBanner } from "../components/monthly-review-tip-banner";
import { useMonthlyReport } from "../hooks/useMonthlyReport";
import { useMonthlyReviewShare } from "../hooks/useMonthlyReviewShare";
import { formatMonth } from "../utils/month-utils";

export default function MonthlyReviewScreen() {
  // — Hooks ——————————————————————————————————————————————————————
  const router = useRouter();
  const { t, i18n } = useTranslation("settings");
  const { userProfile } = useUserProfile();
  // Latest viewable month is last month — the current one is still in progress.
  const latestReviewableMonth = startOfMonth(subMonths(new Date(), 1));
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => latestReviewableMonth);
  const [isTipDismissed, setIsTipDismissed] = useState(false);
  const shareCardRef = useRef<View>(null);
  const { isSharingImage, shareImage } = useMonthlyReviewShare({ captureTargetRef: shareCardRef });

  // — Derived values —————————————————————————————————————————————
  // Don't let users page back before sign-up month — those months are always empty.
  const earliestReviewableMonth = userProfile?.signUpAt
    ? startOfMonth(new Date(userProfile.signUpAt))
    : null;
  // A brand-new user has no completed month since signing up — their sign-up month is
  // later than the latest reviewable month, so there's nothing to review yet.
  const hasNoReviewableMonth =
    earliestReviewableMonth !== null && isAfter(earliestReviewableMonth, latestReviewableMonth);

  // Nothing to review yet → skip the fetch entirely (the screen shows a coming-soon state instead).
  const { report, isLoading, generate, isGenerating } = useMonthlyReport(
    selectedMonth,
    !hasNoReviewableMonth,
  );

  const isAtLatestMonth = isSameMonth(selectedMonth, latestReviewableMonth);
  const isAtEarliestMonth =
    earliestReviewableMonth !== null && isSameMonth(selectedMonth, earliestReviewableMonth);
  const displayMonth = formatMonth(selectedMonth, i18n.language);
  const recipientName = userProfile?.displayName ?? "Friend";
  const showShareButton = report !== null && !hasNoReviewableMonth;
  const showLowActivityTip = report?.isLowActivity === true && !isTipDismissed;

  // — Handlers ———————————————————————————————————————————————————
  const handleShareMonthlyReview = () => {
    if (!report || isSharingImage) return;
    void shareImage();
  };

  const handlePrevMonth = () => {
    if (!isAtEarliestMonth) setSelectedMonth((month) => addMonths(month, -1));
  };

  const handleNextMonth = () => {
    if (!isAtLatestMonth) setSelectedMonth((month) => addMonths(month, 1));
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
        {showShareButton && (
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
      {hasNoReviewableMonth ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-white">
            <MaterialCommunityIcons name="email-outline" size={36} color="#7AC74F" />
          </View>
          <Text className="mb-2 text-center text-xl font-balooBold text-secondary">
            {t("monthlyReview.comingSoonTitle")}
          </Text>
          <Text className="text-center text-base font-baloo leading-6 text-secondary/70">
            {t("monthlyReview.comingSoonBody")}
          </Text>
        </View>
      ) : (
        <>
          <View className="px-5 mb-4">
            <MonthSelector
              label={displayMonth}
              onPrev={handlePrevMonth}
              onNext={handleNextMonth}
              disablePrev={isAtEarliestMonth}
              disableNext={isAtLatestMonth}
            />
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
            <View className="px-5">
              {showLowActivityTip && (
                <MonthlyReviewTipBanner
                  text={t("monthlyReview.lowActivityHint")}
                  onDismiss={() => setIsTipDismissed(true)}
                />
              )}

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
            </View>
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}
