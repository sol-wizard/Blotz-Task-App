import { RefObject, useState } from "react";
import { View } from "react-native";
import { captureRef, releaseCapture } from "react-native-view-shot";
import { shareAsync } from "expo-sharing";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";

type Params = {
  captureTargetRef: RefObject<View | null>;
};

export function useMonthlyReviewShare({ captureTargetRef }: Params) {
  const { t } = useTranslation("settings");

  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [isGeneratingShareImage, setIsGeneratingShareImage] = useState(false);
  const [isSharingImage, setIsSharingImage] = useState(false);

  const prepareSharePreview = async () => {
    if (isGeneratingShareImage) {
      return;
    }

    const captureTarget = captureTargetRef.current;

    if (!captureTarget) {
      Toast.show({ type: "error", text1: t("monthlyReview.error") });
      return;
    }

    setIsGeneratingShareImage(true);

    try {
      setPreviewImageUri(null);

      const uri = await captureRef(captureTarget, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      setPreviewImageUri(uri);
    } catch {
      Toast.show({ type: "error", text1: t("monthlyReview.error") });
    } finally {
      setIsGeneratingShareImage(false);
    }
  };

  const shareImage = async () => {
    if (!previewImageUri || isSharingImage) {
      return;
    }

    setIsSharingImage(true);

    try {
      await shareAsync(previewImageUri, {
        mimeType: "image/png",
        UTI: "public.png",
      });

      closeSharePreview();
    } catch {
      Toast.show({ type: "error", text1: t("monthlyReview.error") });
    } finally {
      setIsSharingImage(false);
    }
  };

  const closeSharePreview = () => {
    if (previewImageUri) {
      try {
        releaseCapture(previewImageUri);
      } catch {
        // Ignore cleanup failure.
      }
    }

    setPreviewImageUri(null);
  };

  return {
    previewImageUri,
    isGeneratingShareImage,
    isSharingImage,
    prepareSharePreview,
    shareImage,
    closeSharePreview,
  };
}
