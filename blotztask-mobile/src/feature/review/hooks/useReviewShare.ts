import { RefObject, useState } from "react";
import { View } from "react-native";
import { captureRef, releaseCapture } from "react-native-view-shot";
import { shareAsync } from "expo-sharing";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";
import { EVENTS, type ShareContentType, type ShareSource } from "@/shared/constants/posthog-events";
import { analytics } from "@/shared/services/analytics";

type Params = {
  captureTargetRef: RefObject<View | null>;
  source: ShareSource;
  contentType: ShareContentType;
};

export function useReviewShare({ captureTargetRef, source, contentType }: Params) {
  const { t } = useTranslation("settings");

  const [isSharingImage, setIsSharingImage] = useState(false);

  const shareImage = async () => {
    if (isSharingImage) {
      return;
    }
    // first entry: share clicked
    analytics.trackShare(EVENTS.SHARE_CLICKED, {
      source,
      contentType,
    });

    const captureTarget = captureTargetRef.current;

    if (!captureTarget) {
      analytics.trackShare(EVENTS.SHARE_FAILED, {
        source,
        contentType,
        error: "capture_failed",
      });

      Toast.show({ type: "error", text1: t("review.shareError") });
      return;
    }

    setIsSharingImage(true);
    let capturedUri: string | null = null;
    let failureStage: "capture" | "share" = "capture";

    try {
      capturedUri = await captureRef(captureTarget, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      // sharing stage start
      failureStage = "share";

      const sharePromise = shareAsync(capturedUri, {
        mimeType: "image/png",
        UTI: "public.png",
      });

      analytics.trackShare(EVENTS.SHARE_SHEET_OPENED, {
        source,
        contentType,
      });

      await sharePromise;

      analytics.trackShare(EVENTS.SHARE_COMPLETED, {
        source,
        contentType,
      });
    } catch {
      analytics.trackShare(EVENTS.SHARE_FAILED, {
        source,
        contentType,
        error: failureStage === "capture" ? "capture_failed" : "share_failed",
      });

      Toast.show({ type: "error", text1: t("review.shareError") });
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
