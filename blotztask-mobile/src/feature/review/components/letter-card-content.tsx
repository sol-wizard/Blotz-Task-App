import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { CustomSpinner } from "@/shared/components/custom-spinner";
import { ReviewPeriodType, ReviewReportDTO } from "../models/review-dto";
import { LetterBody } from "./letter-body";

import { LetterGeneratingState } from "./letter-generating-state";
import { LetterSignature } from "./letter-signature";
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
    content = (
      <>
        <LetterBody recipientName={recipientName} body={report.letter ?? ""} />
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
