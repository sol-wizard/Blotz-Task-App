import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { usePathname } from "expo-router";
import { addScreenshotListener } from "expo-screen-capture";
import { useDebouncedCallback } from "use-debounce";
import { useBadgeQueueStore } from "@/feature/badge/hooks/useBadgeQueueStore";
import { analytics } from "@/shared/services/analytics";
import { FeedbackImage } from "../modals/feedback-image";
import { captureCurrentPage } from "../util/capture-current-page";

const CARD_AUTO_HIDE_MS = 5000;

// Android 13 and older can only detect screenshots with a photo-library permission, which the app doesn't ask for.
const ANDROID_14_API_LEVEL = 34;
const canDetectScreenshots =
  Platform.OS === "ios" || (Platform.OS === "android" && Platform.Version >= ANDROID_14_API_LEVEL);

// Screens where a screenshot is for sharing or already is feedback, so the card would only get in the way.
const SKIPPED_PATHS = new Set([
  "/feedback",
  "/settings/feedback",
  "/settings/review",
  "/badge-wall",
  "/badge-details",
  // A native modal that would cover the card, so it could never be seen or tapped.
  "/ai-task-sheet",
]);

// Two frames: one for React to remove the card, one for the native view to redraw without it.
const waitForNextFrame = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

export type ScreenshotFeedback = {
  image: FeedbackImage;
  path: string;
};

// After a system screenshot, holds a capture of the current page for a few seconds so the card can offer feedback.
export function useScreenshotFeedback() {
  const pathname = usePathname();
  const [screenshot, setScreenshot] = useState<ScreenshotFeedback | null>(null);
  const hideLater = useDebouncedCallback(() => setScreenshot(null), CARD_AUTO_HIDE_MS);

  // Re-registered on each page change, so the listener knows which page the screenshot is of.
  useEffect(() => {
    if (!canDetectScreenshots || SKIPPED_PATHS.has(pathname)) return;
    let hasLeftPage = false;

    const subscription = addScreenshotListener(async () => {
      // The badge pop-up is a share screen too, and it can open over any page.
      if (useBadgeQueueStore.getState().queue.length > 0) return;

      try {
        // Hide an earlier card first, so it isn't in the new capture.
        setScreenshot(null);
        await waitForNextFrame();
        const image = await captureCurrentPage();
        if (hasLeftPage) return;
        // A newer screenshot replaces the card and restarts its timer.
        setScreenshot({ image, path: pathname });
        hideLater();
        analytics.trackScreenshotFeedbackShown({ path: pathname });
      } catch {
        // No card is better than an error toast right after a screenshot.
      }
    });
    return () => {
      // The card belongs to the page it was taken on, so leaving the page hides it.
      hasLeftPage = true;
      subscription.remove();
      hideLater.cancel();
      setScreenshot(null);
    };
  }, [pathname, hideLater]);

  const dismiss = () => {
    hideLater.cancel();
    setScreenshot(null);
  };

  return { screenshot, dismiss };
}
