import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { CustomSpinner } from "@/shared/components/custom-spinner";
import { ReviewPeriodType, ReviewReportDTO } from "../models/monthly-review-dto";
import { LetterBody } from "./letter-body";
import { LetterEmptyState } from "./letter-empty-state";
import { LetterGeneratingState } from "./letter-generating-state";
import { LetterSignature } from "./letter-signature";

type Props = {
  isLoading: boolean;
  report: ReviewReportDTO | null;
  recipientName: string;
  isGenerating: boolean;
  onGenerate: () => void;
  period: ReviewPeriodType;
};

export function LetterCardContent({
  isLoading,
  report,
  recipientName,
  isGenerating,
  onGenerate,
  period,
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

  // No report yet → empty state.
  return (
    <>
      <LetterEmptyState period={period} />
      <View className="items-center mb-6">
        <Pressable
          onPress={onGenerate}
          disabled={isGenerating}
          className="px-5 py-2 rounded-full bg-secondary"
        >
          <Text className="text-white font-balooBold">{t(`${ns}.generate`)}</Text>
        </Pressable>
      </View>
    </>
  );
}
