import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { FeedbackImage } from "../modals/feedback-image";

const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.7;

// Shrinks the longest side to 1600 px and re-saves as JPEG, so uploads stay well under the backend's 5 MB cap.
export async function compressFeedbackImage(
  uri: string,
  width: number,
  height: number,
): Promise<FeedbackImage> {
  const context = ImageManipulator.manipulate(uri);

  // Some Android pickers report 0 for the size; resize anyway so a huge photo can't slip through.
  const sizeUnknown = !width || !height;
  if (sizeUnknown || Math.max(width, height) > MAX_SIDE) {
    context.resize(width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }

  const image = await context.renderAsync();
  try {
    const result = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
    return { uri: result.uri, width: result.width, height: result.height };
  } finally {
    // Free the decoded full-size bitmaps now instead of waiting for GC.
    image.release();
    context.release();
  }
}
