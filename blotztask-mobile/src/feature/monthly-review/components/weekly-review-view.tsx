import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";
import { addWeeks, format, isAfter, isSameWeek, subWeeks } from "date-fns";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { LetterCardContent } from "./letter-card-content";
import { LetterHeader } from "./letter-header";
import { MonthlyReviewComingSoon } from "./monthly-review-coming-soon";
import { MonthSelector } from "./month-selector";
import { useReview } from "../hooks/useMonthlyReport";
import { formatWeek, startOfReviewWeek } from "../utils/week-utils";

// Mon–Sun week (see week-utils). Matches date-fns weekStartsOn used there.
const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

export function WeeklyReviewView() {
  const { t, i18n } = useTranslation("settings");
  const { userProfile } = useUserProfile();

  // Latest viewable week is last week — the current one is still in progress.
  const latestReviewableWeek = startOfReviewWeek(subWeeks(new Date(), 1));
  const [selectedWeek, setSelectedWeek] = useState<Date>(() => latestReviewableWeek);

  // Don't let users page back before sign-up week — those weeks are always empty.
  const earliestReviewableWeek = userProfile?.signUpAt
    ? startOfReviewWeek(new Date(userProfile.signUpAt))
    : null;
  // A brand-new user has no completed week since signing up — nothing to review yet.
  const hasNoReviewableWeek =
    earliestReviewableWeek !== null && isAfter(earliestReviewableWeek, latestReviewableWeek);

  // anchorDate is the selected week's Monday; the backend snaps it to the canonical period.
  const anchorDate = format(selectedWeek, "yyyy-MM-dd");
  const { report, isLoading, generate, isGenerating } = useReview(
    "weekly",
    anchorDate,
    !hasNoReviewableWeek,
  );

  const isAtLatestWeek = isSameWeek(selectedWeek, latestReviewableWeek, WEEK_OPTIONS);
  const isAtEarliestWeek =
    earliestReviewableWeek !== null &&
    isSameWeek(selectedWeek, earliestReviewableWeek, WEEK_OPTIONS);
  const displayWeek = formatWeek(selectedWeek, i18n.language);
  const recipientName = userProfile?.displayName ?? t("monthlyReview.defaultRecipient");

  const handlePrevWeek = () => {
    if (!isAtEarliestWeek) setSelectedWeek((week) => subWeeks(week, 1));
  };

  const handleNextWeek = () => {
    if (!isAtLatestWeek) setSelectedWeek((week) => addWeeks(week, 1));
  };

  if (hasNoReviewableWeek) {
    return (
      <MonthlyReviewComingSoon
        title={t("weeklyReview.comingSoonTitle")}
        body={t("weeklyReview.comingSoonBody")}
      />
    );
  }

  return (
    <>
      <View className="px-5 mb-4">
        <MonthSelector
          label={displayWeek}
          onPrev={handlePrevWeek}
          onNext={handleNextWeek}
          disablePrev={isAtEarliestWeek}
          disableNext={isAtLatestWeek}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View className="px-5">
          <View className="rounded-3xl bg-[#FFFBF3] px-7 pt-7 pb-8">
            <LetterHeader
              displayPeriod={displayWeek}
              recipientName={recipientName}
              pictureUrl={userProfile?.pictureUrl}
              letterLabel={t("weeklyReview.letterLabel")}
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
  );
}
