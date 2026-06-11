import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { CustomSpinner } from "@/shared/components/custom-spinner";

const STAGE_INTERVAL_MS = 3000;

const STAGE_KEYS = [
  "monthlyReview.generatingStage1",
  "monthlyReview.generatingStage2",
  "monthlyReview.generatingStage3",
] as const;

export function LetterGeneratingState() {
  const { t } = useTranslation("settings");
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStageIndex((index) => (index + 1) % STAGE_KEYS.length);
    }, STAGE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  return (
    <View className="py-12 items-center">
      <CustomSpinner size={48} />
      <Text className="text-base font-baloo text-secondary/60 mt-3 text-center">
        {t(STAGE_KEYS[stageIndex])}
      </Text>
    </View>
  );
}
