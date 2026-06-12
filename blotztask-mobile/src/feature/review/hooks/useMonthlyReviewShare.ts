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

  const [isSharingImage, setIsSharingImage] = useState(false);

  const shareImage = async () => {
    if (isSharingImage) {
      return;
    }

    const captureTarget = captureTargetRef.current;

    if (!captureTarget) {
      Toast.show({ type: "error", text1: t("monthlyReview.shareError") });
      return;
    }

    setIsSharingImage(true);
    let capturedUri: string | null = null;

    try {
      capturedUri = await captureRef(captureTarget, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      await shareAsync(capturedUri, {
        mimeType: "image/png",
        UTI: "public.png",
      });
    } catch {
      Toast.show({ type: "error", text1: t("monthlyReview.shareError") });
    } finally {
      setIsSharingImage(false);

      if (capturedUri) {
        releaseCapture(capturedUri);
      }
    }
  };

  return {
    isSharingImage,
    shareImage,
  };
}
