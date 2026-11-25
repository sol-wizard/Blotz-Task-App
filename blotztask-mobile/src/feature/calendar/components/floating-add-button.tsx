import { memo, useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  clamp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { z } from "zod";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";
import { theme } from "@/shared/constants/theme";
import { LAYOUT_SPRING } from "@/shared/constants/animations/motion";

const SIZE = 56;
const MARGIN = 16;
const SNAP_SPRING = { damping: 18, stiffness: 200 };

type Side = "left" | "right";
// `ratio` is how far down the free space the + sits: 0 = top, 1 = bottom. A ratio rather than
// pixels, so the spot holds when that space changes size (the week calendar opening or closing).
type SavedPosition = { side: Side; ratio: number };
type Area = { width: number; height: number };

// Until the + is first dragged: halfway down the right side.
const DEFAULT_POSITION: SavedPosition = { side: "right", ratio: 0.5 };

const savedPositionSchema = z.object({
  side: z.enum(["left", "right"]),
  ratio: z.number().min(0).max(1),
});

// Anything that can't be used (unreadable, or pixels saved by older builds as { side, y }) gives
// null, so the + goes back to the default spot.
function parseSavedPosition(value: string | null): SavedPosition | null {
  if (!value) return null;
  const result = savedPositionSchema.safeParse(JSON.parse(value));
  return result.success ? result.data : null;
}

/**
 * The + that opens a new task. It can be dragged between `top` and the bottom of the screen, snaps
 * to the nearest side when let go, and stays there across restarts. Render it as the last child of
 * a screen: it fills the screen to measure where it may go, without taking any touches outside the
 * button. Keep it out of views with a layout animation, or every frame of a drag stutters.
 *
 * `date`: the day being viewed (yyyy-MM-dd), so a new task starts on it.
 * `top`: where the free space starts, in px from the top of the screen (on Home: just below the
 * status tabs). Nothing is shown until it is known.
 * `startAtDefault`: start at the default spot even if a spot was saved (when `top` is only a guess).
 */
// Memoised, so the screen re-rendering (e.g. task refetches) doesn't rebuild its gestures.
export const FloatingAddButton = memo(function FloatingAddButton({
  date,
  top,
  startAtDefault = false,
}: {
  date: string;
  top: number | undefined;
  startAtDefault?: boolean;
}) {
  const { t } = useTranslation("tasks");
  const [area, setArea] = useState<Area | null>(null);
  // Read once when the screen opens; undefined while loading, null when nothing is saved yet.
  // Later drags only write to storage, so a re-render never cuts the snap animation short.
  const [saved, setSaved] = useState<SavedPosition | null>();

  // The spot the + belongs in: null until the first placement, then changed only by a drag. Every
  // size change places the + from it again. Kept in plain JS, not in a shared value: on the JS
  // thread a shared value write is queued for the UI thread, so reading it straight back can give
  // the old value. That is what left the + stuck at the top edge.
  const wanted = useRef<SavedPosition | null>(null);

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  // Hidden until the first placement, so it never flashes at the top-left corner. Written on the JS
  // thread and only read on the UI thread.
  const isPlaced = useSharedValue(false);

  const minX = MARGIN;
  const maxX = (area?.width ?? 0) - SIZE - MARGIN;
  const maxY = (area?.height ?? 0) - SIZE - MARGIN;
  // Never below maxY: when the free space is too short for the button, it sits at the bottom
  // rather than disappearing (it is Home's only way to add a task by hand).
  const minY = Math.min((top ?? 0) + MARGIN, maxY);
  const midX = (area?.width ?? 0) / 2;
  // A screen too small to hold the button (e.g. a first layout before the screen has its real size)
  // is never used for placing: wait for a real one.
  const isReady = saved !== undefined && top !== undefined && maxX >= minX && maxY >= MARGIN;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.FLOATING_ADD_BUTTON_POSITION)
      .then((value) => setSaved(parseSavedPosition(value)))
      // A missing or unreadable value just means the default spot.
      .catch(() => setSaved(null));
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const isFirst = wanted.current === null;
    const { side, ratio } = (wanted.current ??=
      (startAtDefault ? null : saved) ?? DEFAULT_POSITION);
    const toX = side === "left" ? minX : maxX;
    const toY = minY + ratio * (maxY - minY);
    // The first time it appears straight in place. After that it moves with the same spring as the
    // list around it (the week calendar opening or closing), so the two stay together.
    x.value = isFirst ? toX : withSpring(toX, LAYOUT_SPRING);
    y.value = isFirst ? toY : withSpring(toY, LAYOUT_SPRING);
    isPlaced.value = true;
  }, [isReady, saved, startAtDefault, minX, maxX, minY, maxY, isPlaced, x, y]);

  const rememberPosition = (position: SavedPosition) => {
    wanted.current = position;
    AsyncStorage.setItem(STORAGE_KEYS.FLOATING_ADD_BUTTON_POSITION, JSON.stringify(position)).catch(
      () => {},
    );
  };

  const openTaskCreate = () => router.push({ pathname: "/task-create", params: { date } });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (area?.width !== width || area?.height !== height) setArea({ width, height });
  };

  const pan = Gesture.Pan()
    .minDistance(8)
    .onStart(() => {
      startX.value = x.value;
      startY.value = y.value;
    })
    .onUpdate((event) => {
      x.value = clamp(startX.value + event.translationX, minX, maxX);
      y.value = clamp(startY.value + event.translationY, minY, maxY);
    })
    .onEnd(() => {
      const side: Side = x.value + SIZE / 2 < midX ? "left" : "right";
      // Clamped, in case the area changed size during the drag: an out-of-range value would be
      // thrown away on the next start.
      const ratio =
        maxY > minY ? clamp((y.value - minY) / (maxY - minY), 0, 1) : DEFAULT_POSITION.ratio;
      x.value = withSpring(side === "left" ? minX : maxX, SNAP_SPRING);
      scheduleOnRN(rememberPosition, { side, ratio });
    });

  // A tap only counts when the finger didn't move far enough to start a drag.
  const tap = Gesture.Tap().onEnd((_event, success) => {
    if (success) scheduleOnRN(openTaskCreate);
  });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: isPlaced.value ? 1 : 0,
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill} onLayout={handleLayout}>
      {isReady && (
        <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
          <Animated.View
            accessible
            accessibilityRole="button"
            accessibilityLabel={t("form.createTask")}
            // Screen readers activate the button through this, not through the tap gesture.
            accessibilityActions={[{ name: "activate" }]}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === "activate") openTaskCreate();
            }}
            // No NativeWind className here: the moving style stays the only style source that
            // Reanimated has to merge.
            style={[styles.button, animatedStyle]}
          >
            <MaterialCommunityIcons name="plus" size={32} color="#FFFFFF" />
          </Animated.View>
        </GestureDetector>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    left: 0,
    top: 0,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: theme.colors.highlight,
    alignItems: "center",
    justifyContent: "center",
  },
});
