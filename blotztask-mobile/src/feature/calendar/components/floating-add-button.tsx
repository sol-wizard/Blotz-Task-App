import { useEffect, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  clamp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";

const SIZE = 56;
const MARGIN = 16;
const SNAP_SPRING = { damping: 18, stiffness: 200 };

type Side = "left" | "right";
type SavedPosition = { side: Side; y: number };
type Area = { width: number; height: number };

/**
 * The + that opens a new task. It can be dragged anywhere, snaps to the nearest side when let go,
 * and stays there across restarts. Render it as the last child of a screen: it fills the screen
 * to measure where it may go, without taking any touches outside the button.
 */
export function FloatingAddButton() {
  const { t } = useTranslation("tasks");
  const insets = useSafeAreaInsets();
  const [area, setArea] = useState<Area | null>(null);
  // Read once when the screen opens; undefined while loading, null when nothing is saved yet.
  // Later drags only write to storage, so a re-render never cuts the snap animation short.
  const [saved, setSaved] = useState<SavedPosition | null>();

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  // Where it is now, so a later size change keeps it there rather than going back to `saved`.
  const isLeft = useSharedValue(false);
  const isPlaced = useSharedValue(false);

  const minX = MARGIN;
  const maxX = (area?.width ?? 0) - SIZE - MARGIN;
  const minY = insets.top + MARGIN;
  const maxY = (area?.height ?? 0) - SIZE - MARGIN;
  const midX = (area?.width ?? 0) / 2;
  const isReady = area !== null && saved !== undefined;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.FLOATING_ADD_BUTTON_POSITION)
      .then((value) => setSaved(value ? (JSON.parse(value) as SavedPosition) : null))
      // A missing or unreadable value just means the default spot.
      .catch(() => setSaved(null));
  }, []);

  // Place it once the screen size and the saved spot are known (bottom-right by default); after
  // that a size change only keeps it on its side and inside the screen.
  useEffect(() => {
    if (!isReady) return;
    if (!isPlaced.value) {
      isLeft.value = saved?.side === "left";
      y.value = saved?.y ?? maxY;
      isPlaced.value = true;
    }
    x.value = isLeft.value ? minX : maxX;
    y.value = clamp(y.value, minY, maxY);
  }, [isReady, saved, minX, maxX, minY, maxY, isLeft, isPlaced, x, y]);

  const savePosition = (side: Side, savedY: number) => {
    const position: SavedPosition = { side, y: savedY };
    AsyncStorage.setItem(STORAGE_KEYS.FLOATING_ADD_BUTTON_POSITION, JSON.stringify(position)).catch(
      () => {},
    );
  };

  const openTaskCreate = () => router.push("/task-create");

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
      isLeft.value = side === "left";
      x.value = withSpring(side === "left" ? minX : maxX, SNAP_SPRING);
      scheduleOnRN(savePosition, side, y.value);
    });

  // A tap only counts when the finger didn't move far enough to start a drag.
  const tap = Gesture.Tap().onEnd((_event, success) => {
    if (success) scheduleOnRN(openTaskCreate);
  });

  const animatedStyle = useAnimatedStyle(() => ({
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
            style={[styles.button, animatedStyle]}
            className="rounded-full bg-highlight items-center justify-center"
          >
            <MaterialCommunityIcons name="plus" size={32} color="#FFFFFF" />
          </Animated.View>
        </GestureDetector>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { position: "absolute", left: 0, top: 0, width: SIZE, height: SIZE },
});
