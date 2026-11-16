import { parseISO } from "date-fns";
import * as Sentry from "@sentry/react-native";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { widgetsDirectory } from "expo-widgets";
import TodayTasksWidget from "@/feature/widget/ios/components/ios-tasks-widget";
import { WIDGET_STAR_IMAGES } from "@/feature/widget/config/widget-config";
import type {
  TasksWidgetSnapshot,
  WidgetStarVariant,
} from "@/feature/widget/models/tasks-widget-snapshot";
import { getWidgetStarVariant } from "@/feature/widget/util/widget-stars-util";

// Bump the version when the star PNGs change, so phones copy the new files.
const STAR_FILE_VERSION = 1;

export async function syncIosTodayTasksWidgetCache(
  snapshots: TasksWidgetSnapshot[],
): Promise<void> {
  try {
    const starImageUris = await copyStarImagesToWidgetsDirectory();

    await TodayTasksWidget.updateTimeline(
      [...snapshots]
        .sort((first, second) => first.cacheDate.localeCompare(second.cacheDate))
        .map((snapshot) => {
          const starVariant = getWidgetStarVariant(snapshot.tasks.length);
          const starImageUri = starImageUris[starVariant];

          return {
            date: parseISO(snapshot.cacheDate),
            props: {
              ...snapshot,
              starImage: starImageUri
                ? {
                    uri: starImageUri,
                    width: WIDGET_STAR_IMAGES[starVariant].width,
                    height: WIDGET_STAR_IMAGES[starVariant].height,
                  }
                : undefined,
            },
          };
        }),
    );
  } catch (error) {
    Sentry.captureException(error, { tags: { source: "ios-widget-timeline" } });
  }
}

// The widget runs in its own process and can't read the app's bundled images,
// so the stars are copied into the App Group folder the widget can read.
async function copyStarImagesToWidgetsDirectory(): Promise<
  Partial<Record<WidgetStarVariant, string>>
> {
  const uris: Partial<Record<WidgetStarVariant, string>> = {};
  if (!widgetsDirectory) return uris;

  for (const variant of ["empty", "single", "multi"] as const) {
    try {
      const target = new File(widgetsDirectory, `stars-${variant}-v${STAR_FILE_VERSION}.png`);

      if (!target.exists) {
        const [asset] = await Asset.loadAsync(WIDGET_STAR_IMAGES[variant].source);
        if (!asset.localUri) continue;

        await new File(asset.localUri).copy(target);
      }

      uris[variant] = target.uri;
    } catch (error) {
      // Stars are decorative: the widget still renders without them.
      Sentry.captureException(error, { tags: { source: "ios-widget-stars" } });
    }
  }

  return uris;
}
