import { useState, useRef } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { addMonths, format, isAfter, isSameMonth, startOfMonth, subMonths } from "date-fns";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { formatLocalizedDate } from "@/shared/util/localized-date-format";
import { LetterCardContent } from "../components/letter-card-content";
import { LetterHeader } from "../components/letter-header";
import { PeriodSelector } from "../components/period-selector";
import { ReviewComingSoon } from "../components/review-coming-soon";
import { ReviewHeader } from "../components/review-header";
import { ReviewTipBanner } from "../components/review-tip-banner";
import { ReviewTab, ReviewTabs } from "../components/review-tabs";
import { WeeklyReviewView } from "../components/weekly-review-view";
import { useReview } from "../hooks/useReviewReport";
import { useReviewShare } from "../hooks/useReviewShare";
import { ReviewPeriodType } from "../models/review-dto";

export default function ReviewScreen() {
  // — Hooks ——————————————————————————————————————————————————————
  const router = useRouter();
  const { t, i18n } = useTranslation("settings");
  const { userProfile } = useUserProfile();
  // Default to Weekly — it produces fresh content more often than Monthly.
  const [activeTab, setActiveTab] = useState<ReviewTab>(ReviewPeriodType.Weekly);
  // Latest viewable month is last month — the current one is still in progress.
  const latestReviewableMonth = startOfMonth(subMonths(new Date(), 1));
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => latestReviewableMonth);
  const [isTipDismissed, setIsTipDismissed] = useState(false);
  const [isWeeklyShareAvailable, setIsWeeklyShareAvailable] = useState(false);
  const monthlyShareCardRef = useRef<View>(null);
  const weeklyShareCardRef = useRef<View>(null);

  // — Derived values —————————————————————————————————————————————
  const isMonthlyTab = activeTab === ReviewPeriodType.Monthly;
  const activeShareCardRef = isMonthlyTab ? monthlyShareCardRef : weeklyShareCardRef;
  const { isSharingImage, shareImage } = useReviewShare({
    captureTargetRef: activeShareCardRef,
  });
  // Don't let users page back before sign-up month — those months are always empty.
  const earliestReviewableMonth = userProfile?.signUpAt
    ? startOfMonth(new Date(userProfile.signUpAt))
    : null;
  // A brand-new user has no completed month since signing up — their sign-up month is
  // later than the latest reviewable month, so there's nothing to review yet.
  const hasNoReviewableMonth =
    earliestReviewableMonth !== null && isAfter(earliestReviewableMonth, latestReviewableMonth);

  // Only fetch the monthly report while the Monthly tab is active and there's a month to review.
  // anchorDate is the selected month's first day; the backend snaps it to the canonical period.
  const anchorDate = format(selectedMonth, "yyyy-MM-dd");
  const { report, isLoading, generate, isGenerating } = useReview(
    ReviewPeriodType.Monthly,
    anchorDate,
    isMonthlyTab && !hasNoReviewableMonth,
  );

  const isAtLatestMonth = isSameMonth(selectedMonth, latestReviewableMonth);
  const isAtEarliestMonth =
    earliestReviewableMonth !== null && isSameMonth(selectedMonth, earliestReviewableMonth);
  const displayMonth = formatLocalizedDate(selectedMonth, "yearMonth", i18n.language);
  const recipientName = userProfile?.displayName ?? t("review.defaultRecipient");
  const showShareButton = isMonthlyTab
    ? report !== null && !hasNoReviewableMonth
    : isWeeklyShareAvailable;
  const showLowActivityTip = report?.isLowActivity === true && !isTipDismissed;

  // — Handlers ———————————————————————————————————————————————————
  const handleShareReview = () => {
    if (!showShareButton || isSharingImage) return;
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
      <ReviewHeader
        title={t("review.title")}
        onBack={() => router.back()}
        showShare={showShareButton}
        isSharing={isSharingImage}
        onShare={handleShareReview}
      />

      <View className="px-5 mb-4">
        <ReviewTabs activeTab={activeTab} onChange={setActiveTab} />
      </View>

      {activeTab === ReviewPeriodType.Weekly ? (
        <WeeklyReviewView
          shareCardRef={weeklyShareCardRef}
          onShareAvailableChange={setIsWeeklyShareAvailable}
        />
      ) : hasNoReviewableMonth ? (
        <ReviewComingSoon />
      ) : (
        <>
          <View className="px-5 mb-4">
            <PeriodSelector
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
                <ReviewTipBanner
                  text={t("monthlyReview.lowActivityHint")}
                  onDismiss={() => setIsTipDismissed(true)}
                />
              )}

              <View
                ref={monthlyShareCardRef}
                collapsable={false}
                className="rounded-3xl bg-[#FFFBF3] px-7 pt-7 pb-8"
              >
                <LetterHeader
                  displayPeriod={displayMonth}
                  recipientName={recipientName}
                  pictureUrl={userProfile?.pictureUrl}
                />
                <LetterCardContent
                  isLoading={isLoading}
                  report={report}
                  recipientName={recipientName}
                  isGenerating={isGenerating}
                  onGenerate={generate}
                  period={ReviewPeriodType.Monthly}
                />
              </View>
            </View>
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}
