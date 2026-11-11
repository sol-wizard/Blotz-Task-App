import { Dimensions, PixelRatio } from "react-native";
import { captureScreen, releaseCapture } from "react-native-view-shot";
import { FeedbackImage } from "../modals/feedback-image";
import { compressFeedbackImage } from "./compress-feedback-image";

// Captures what the app is showing right now, shrunk like a picked photo so it can go straight into feedback.
// Draws the app's own window, so no photo-library permission is needed.
export async function captureCurrentPage(): Promise<FeedbackImage> {
  const uri = await captureScreen({ format: "jpg", quality: 0.9, result: "tmpfile" });
  try {
    // captureScreen gives no size; it renders the window at device pixels, so the longest side is resized correctly.
    const { width, height } = Dimensions.get("window");
    return await compressFeedbackImage(
      uri,
      PixelRatio.getPixelSizeForLayoutSize(width),
      PixelRatio.getPixelSizeForLayoutSize(height),
    );
  } finally {
    // Only the compressed copy is kept; the full-size capture is deleted now.
    releaseCapture(uri);
  }
}
