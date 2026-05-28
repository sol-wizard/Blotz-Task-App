import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { captureRef, releaseCapture } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { Asset, requestPermissionsAsync } from "expo-media-library";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";

type Params = {
  captureTargetRef: RefObject<View | null>;
};

const safeReleaseCapture = (uri: string | null) => {
  if (!uri) {
    return;
  }

  try {
    releaseCapture(uri);
  } catch {
    // Ignore cleanup failure. The main user-facing action has already completed.
  }
};

export function useMonthlyReviewShare({ captureTargetRef }: Params) {
  const { t } = useTranslation("settings");

  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [isGeneratingShareImage, setIsGeneratingShareImage] = useState(false);
  const [isSharingImage, setIsSharingImage] = useState(false);

  const previewImageUriRef = useRef<string | null>(null);

  const setTrackedPreviewImageUri = (uri: string | null) => {
    previewImageUriRef.current = uri;
    setPreviewImageUri(uri);
  };

  const prepareSharePreview = useCallback(async () => {
    if (isGeneratingShareImage) {
      return;
    }

    const captureTarget = captureTargetRef.current;

    if (!captureTarget) {
      Toast.show({ type: "error", text1: t("monthlyReview.shareErrorMessage") });
      return;
    }

    setIsGeneratingShareImage(true);

    try {
      safeReleaseCapture(previewImageUriRef.current);
      setTrackedPreviewImageUri(null);

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      const uri = await captureRef(captureTarget, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      setTrackedPreviewImageUri(uri);
    } catch {
      Toast.show({ type: "error", text1: t("monthlyReview.shareErrorMessage") });
    } finally {
      setIsGeneratingShareImage(false);
    }
  }, [captureTargetRef, isGeneratingShareImage, setTrackedPreviewImageUri, t]);

  const shareImage = useCallback(async () => {
    const imageUri = previewImageUriRef.current;

    if (!imageUri || isSharingImage) {
      return;
    }

    setIsSharingImage(true);

    try {
      const isAvailable = await Sharing.isAvailableAsync();

      if (!isAvailable) {
        Toast.show({ type: "error", text1: t("monthlyReview.shareErrorMessage") });
        return;
      }

      await Sharing.shareAsync(imageUri, {
        mimeType: "image/png",
        UTI: "public.png",
      });
    } catch {
      Toast.show({ type: "error", text1: t("monthlyReview.shareErrorMessage") });
    } finally {
      setIsSharingImage(false);
    }
  }, [isSharingImage, t]);

  const closeSharePreview = useCallback(() => {
    safeReleaseCapture(previewImageUriRef.current);
    setTrackedPreviewImageUri(null);
  }, [setTrackedPreviewImageUri]);

  useEffect(() => {
    return () => {
      safeReleaseCapture(previewImageUriRef.current);
    };
  }, []);

  return {
    previewImageUri,
    isGeneratingShareImage,
    isSharingImage,
    prepareSharePreview,
    shareImage,
    closeSharePreview,
  };
}
