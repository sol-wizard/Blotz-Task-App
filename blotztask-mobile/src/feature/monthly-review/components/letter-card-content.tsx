import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { CustomSpinner } from "@/shared/components/custom-spinner";
import { MonthlyReviewDTO } from "../models/monthly-review-dto";
import { LetterBody } from "./letter-body";
import { LetterEmptyState } from "./letter-empty-state";
import { LetterSignature } from "./letter-signature";

type Props = {
  isLoading: boolean;
  report: MonthlyReviewDTO | null;
  recipientName: string;
  isGenerating: boolean;
  onGenerate: () => void;
};

export function LetterCardContent({
  isLoading,
  report,
  recipientName,
  isGenerating,
  onGenerate,
}: Props) {
  const { t } = useTranslation("settings");

  if (isLoading) {
    // TODO: replace with a shared inline loading component once one exists.
    return (
      <View className="py-12 items-center">
        <CustomSpinner size={48} />
        <Text className="text-base font-baloo text-secondary/60 mt-3 text-center">
          {t("monthlyReview.loading")}
        </Text>
      </View>
    );
  }

  if (report) {
    return (
      <>
        <LetterBody recipientName={recipientName} body={report.aiGeneratedLetter} />
        <LetterSignature />
      </>
    );
  }

  // No report yet → empty state.
  return (
    <>
      <LetterEmptyState />
      <View className="items-center mb-6">
        <Pressable
          onPress={onGenerate}
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
  );
}
