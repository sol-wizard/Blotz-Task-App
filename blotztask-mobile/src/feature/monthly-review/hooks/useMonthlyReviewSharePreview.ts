import { useState } from "react";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";

export function useMonthlyReviewSharePreview() {
  const { t } = useTranslation("settings");
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [isGeneratingShareImage, setIsGeneratingShareImage] = useState(false);

  const startShareImageGeneration = () => {
    setIsGeneratingShareImage(true);
  };

  const handleShareImageGenerated = (uri: string) => {
    setPreviewImageUri(uri);
    setIsGeneratingShareImage(false);
  };

  const handleShareImageGenerationError = () => {
    Toast.show({ type: "error", text1: t("monthlyReview.shareErrorMessage") });
    setIsGeneratingShareImage(false);
  };

  const closeSharePreview = () => {
    setPreviewImageUri(null);
  };

  return {
    previewImageUri,
    isGeneratingShareImage,
    startShareImageGeneration,
    handleShareImageGenerated,
    handleShareImageGenerationError,
    closeSharePreview,
  };
}
