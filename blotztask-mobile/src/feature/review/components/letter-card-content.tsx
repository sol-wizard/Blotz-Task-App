import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { CustomSpinner } from "@/shared/components/custom-spinner";
import { ReviewPeriodType, ReviewReportDTO } from "../models/review-dto";
import { LetterBody } from "./letter-body";

import { LetterGeneratingState } from "./letter-generating-state";
import { LetterSignature } from "./letter-signature";
import { MonthlyLetterInProgressState } from "./monthly-letter-in-progress-state";
import { LetterReadyState } from "./letter-ready-state";

type Props = {
  isLoading: boolean;
  report: ReviewReportDTO | null;
  recipientName: string;
  isGenerating: boolean;
  onGenerate: () => void;
  period: ReviewPeriodType;
  isCurrentMonth?: boolean;
  periodName: string;
};

export function LetterCardContent({
  isLoading,
  report,
  recipientName,
  isGenerating,
  onGenerate,
  period,
  isCurrentMonth = false,
  periodName,
}: Props) {
  const { t } = useTranslation("settings");
  const ns = period === ReviewPeriodType.Weekly ? "weeklyReview" : "monthlyReview";

  if (isLoading) {
    // TODO: replace with a shared inline loading component once one exists.
    return (
      <View className="py-12 items-center">
        <CustomSpinner size={48} />
        <Text className="text-base font-baloo text-secondary/60 mt-3 text-center">
          {t(`${ns}.loading`)}
        </Text>
      </View>
    );
  }

  if (isGenerating) {
    return <LetterGeneratingState />;
  }

  if (isCurrentMonth) {
    return <MonthlyLetterInProgressState />;
  }

  if (report) {
    return (
      <>
        <LetterBody recipientName={recipientName} body={report.letter ?? ""} />
        <LetterSignature />
        <Text className="text-xs font-baloo text-secondary/50 mt-6 text-center">
          {t(`${ns}.aiDisclosure`)}
        </Text>
      </>
    );
  }

  return <LetterReadyState period={period} periodName={periodName} onRead={onGenerate} />;
}
