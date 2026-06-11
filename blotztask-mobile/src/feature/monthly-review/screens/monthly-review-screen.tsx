import { useState, useRef } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { addMonths, isAfter, isSameMonth, startOfMonth, subMonths } from "date-fns";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { LetterCardContent } from "../components/letter-card-content";
import { LetterHeader } from "../components/letter-header";
import { MonthSelector } from "../components/month-selector";
import { MonthlyReviewComingSoon } from "../components/monthly-review-coming-soon";
import { MonthlyReviewHeader } from "../components/monthly-review-header";
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
  const recipientName = userProfile?.displayName ?? t("monthlyReview.defaultRecipient");
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
      <MonthlyReviewHeader
        onBack={() => router.back()}
        showShare={showShareButton}
        isSharing={isSharingImage}
        onShare={handleShareMonthlyReview}
      />

      {hasNoReviewableMonth ? (
        <MonthlyReviewComingSoon />
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
                <LetterHeader
                  displayMonth={displayMonth}
                  recipientName={recipientName}
                  pictureUrl={userProfile?.pictureUrl}
                />
                <LetterCardContent
                  isLoading={isLoading}
                  report={report}
                  recipientName={recipientName}
                  isGenerating={isGenerating}
                  onGenerate={generate}
                />
              </View>
            </View>
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}
