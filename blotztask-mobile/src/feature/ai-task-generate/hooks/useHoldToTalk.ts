import { useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useDebouncedCallback } from "use-debounce";

// Presses shorter than this are treated as accidental taps and discarded;
// anything longer is a real recording and gets uploaded.
const MIN_HOLD_MS = 300;
const HOLD_HINT_AUTO_HIDE_MS = 2500;

type Params = {
  startListening: () => void;
  stopAndUpload: () => Promise<boolean>;
  cancelListening: () => Promise<void>;
  /** Called after a real (long enough) hold is released, with whether the take was uploaded. */
  onSubmitResult?: (didSubmit: boolean) => void;
};

/** Press-and-hold behaviour for a mic button: min hold, misfire feedback, submit on release. */
export function useHoldToTalk({
  startListening,
  stopAndUpload,
  cancelListening,
  onSubmitResult,
}: Params) {
  const heldLongEnough = useRef(false);
  const [isHoldHintVisible, setIsHoldHintVisible] = useState(false);
  const hideHoldHintLater = useDebouncedCallback(
    () => setIsHoldHintVisible(false),
    HOLD_HINT_AUTO_HIDE_MS,
  );
  const micShakeX = useSharedValue(0);
  const micShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: micShakeX.value }],
  }));

  const hideHoldHint = () => {
    hideHoldHintLater.cancel();
    setIsHoldHintVisible(false);
  };

  const onPressIn = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    heldLongEnough.current = false;
    hideHoldHint();
    startListening();
  };

  // Released before MIN_HOLD_MS: discard, but never silently.
  const handleMisfire = async () => {
    micShakeX.value = withSequence(
      ...[-8, 8, -5, 5, 0].map((x) => withTiming(x, { duration: 50 })),
    );
    setIsHoldHintVisible(true);
    hideHoldHintLater();
    await cancelListening(); // iOS mutes haptics while the mic is open

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const handleSubmit = async () => {
    const didSubmit = await stopAndUpload();
    onSubmitResult?.(didSubmit);
  };

  const onPressOut = () => {
    if (heldLongEnough.current) {
      void handleSubmit();
    } else {
      void handleMisfire();
    }
  };

  const onHeldLongEnough = () => {
    heldLongEnough.current = true;
  };

  return {
    minHoldMs: MIN_HOLD_MS,
    onPressIn,
    onPressOut,
    onHeldLongEnough,
    isHoldHintVisible,
    hideHoldHint,
    micShakeStyle,
  };
}
