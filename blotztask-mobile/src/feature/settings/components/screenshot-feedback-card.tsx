import { useRef } from "react";
import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import Animated from "react-native-reanimated";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { analytics } from "@/shared/services/analytics";
import { useScreenshotFeedback } from "../hooks/useScreenshotFeedback";

const THUMBNAIL_WIDTH = 64;

// Small card on the right edge after a system screenshot; tapping it opens feedback with that page attached.
export function ScreenshotFeedbackCard() {
  const router = useRouter();
  const { t } = useTranslation("settings");
  const { screenshot, dismiss } = useScreenshotFeedback();
  // A ref, not state, so a fast double tap can't open feedback twice before the re-render.
  const isOpeningRef = useRef(false);

  if (!screenshot) return null;

  const { image, path } = screenshot;
  const thumbnailHeight = (THUMBNAIL_WIDTH * image.height) / image.width;

  const handleOpenFeedback = () => {
    if (isOpeningRef.current) return;
    isOpeningRef.current = true;
    analytics.trackScreenshotFeedbackTapped({ path });
    dismiss();
    router.push({
      pathname: "/feedback",
      params: {
        imageUri: image.uri,
        imageWidth: String(image.width),
        imageHeight: String(image.height),
      },
    });
  };

  return (
    // The animated view is the root, so its slide-out runs when the card is removed.
    // Keyed by image, so a newer screenshot slides in again instead of swapping silently.
    <Animated.View
      key={image.uri}
      entering={MotionAnimations.rightEntering}
      exiting={MotionAnimations.rightExiting}
      className="absolute right-3 bg-white rounded-2xl p-2 items-center"
      style={{
        top: "30%",
        width: THUMBNAIL_WIDTH + 16,
        elevation: 6,
        shadowOpacity: 0.15,
        shadowRadius: 8,
      }}
    >
      <Pressable
        onPress={dismiss}
        hitSlop={8}
        accessibilityLabel={t("feedback.screenshotCardClose")}
        className="absolute -top-2 -right-2 z-10 bg-secondary rounded-full p-0.5"
      >
        <MaterialCommunityIcons name="close" size={14} color="#fff" />
      </Pressable>
      <Pressable onPress={handleOpenFeedback} className="items-center">
        <Image
          source={{ uri: image.uri }}
          style={{ width: THUMBNAIL_WIDTH, height: thumbnailHeight, borderRadius: 8 }}
        />
        <Text className="mt-1.5 text-xs font-balooBold text-secondary text-center leading-4">
          {t("feedback.screenshotCard")}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
