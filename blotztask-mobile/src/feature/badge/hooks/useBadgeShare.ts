import { shareAsync } from "expo-sharing";
import { RefObject, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Toast from "react-native-toast-message";
import { captureRef, releaseCapture } from "react-native-view-shot";

type Params = {
  captureTargetRef: RefObject<View | null>;
};

// Mirrors useReviewShare (captureRef -> shareAsync -> releaseCapture) but reports
// errors via the badge i18n namespace.
export function useBadgeShare({ captureTargetRef }: Params) {
  const { t } = useTranslation("badge");

  const [isSharingImage, setIsSharingImage] = useState(false);

  const shareImage = async () => {
    if (isSharingImage) {
      return;
    }

    const captureTarget = captureTargetRef.current;

    if (!captureTarget) {
      Toast.show({ type: "error", text1: t("shareError") });
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
      Toast.show({ type: "error", text1: t("shareError") });
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
