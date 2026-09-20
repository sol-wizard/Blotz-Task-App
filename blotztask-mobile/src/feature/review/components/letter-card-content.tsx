import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { CustomSpinner } from "@/shared/components/custom-spinner";
import { FormDivider } from "@/shared/components/form-divider";
import { ReviewPeriodType, ReviewReportDTO } from "../models/review-dto";
import { LetterBody } from "./letter-body";

import { LetterGeneratingState } from "./letter-generating-state";
import { LetterNextStep } from "./letter-next-step";
import { LetterSignature } from "./letter-signature";
import { LetterStats } from "./letter-stats";
import { LetterTheme } from "./letter-theme";
import { MonthlyLetterInProgressState } from "./monthly-letter-in-progress-state";
import { LetterReadyState } from "./letter-ready-state";
import { LetterStamp } from "./letter-stamp";

type Props = {
  isLoading: boolean;
  report: ReviewReportDTO | null;
  recipientName: string;
  isGenerating: boolean;
  onGenerate: () => void;
  periodType: ReviewPeriodType;
  isCurrentMonth?: boolean;
  periodLabel: string;
};

export function LetterCardContent({
  isLoading,
  report,
  recipientName,
  isGenerating,
  onGenerate,
  periodType,
  isCurrentMonth = false,
  periodLabel,
}: Props) {
  const { t } = useTranslation("settings");
  const ns = periodType === ReviewPeriodType.Weekly ? "weeklyReview" : "monthlyReview";
  let content;

  if (isLoading) {
    content = (
      <View className="py-12 items-center">
        <CustomSpinner size={48} />
        <Text className="text-base font-baloo text-secondary/60 mt-3 text-center">
          {t(`${ns}.loading`)}
        </Text>
      </View>
    );
  } else if (isGenerating) {
    content = <LetterGeneratingState />;
  } else if (isCurrentMonth) {
    content = <MonthlyLetterInProgressState />;
  } else if (report) {
    // Theme is what marks a letter as written in parts — a quiet month and a pre-split letter
    // both leave it null, and both render body-only. A quiet month still gets a suggestion.
    const theme = periodType === ReviewPeriodType.Monthly ? report.theme : null;
    const nextStep = periodType === ReviewPeriodType.Monthly ? report.oneThingToTryNext : null;

    content = (
      <>
        {theme != null && (
          <>
            <LetterTheme theme={theme} />
            <LetterStats tasksCompleted={report.tasksCompleted} />
            <View className="mb-6">
              <FormDivider marginVertical={0} />
            </View>
          </>
        )}

        <LetterBody recipientName={recipientName} body={report.letter ?? ""} />

        {nextStep != null && <LetterNextStep suggestion={nextStep} />}

        {(theme != null || nextStep != null) && (
          <View className="mb-6">
            <FormDivider marginVertical={0} />
          </View>
        )}

        <LetterSignature />
        <Text className="text-xs font-baloo text-secondary/50 mt-6 text-center">
          {t(`${ns}.aiDisclosure`)}
        </Text>
      </>
    );
  } else {
    content = (
      <LetterReadyState periodType={periodType} periodLabel={periodLabel} onGenerate={onGenerate} />
    );
  }
  return (
    <View className="relative">
      <LetterStamp />
      {content}
    </View>
  );
}
