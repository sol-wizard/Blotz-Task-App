import { Image } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useCallback } from "react";
import * as Haptics from "expo-haptics";
import { useAudioPlayer } from "expo-audio";
import { ASSETS } from "@/shared/constants/assets";

export const MachineButton = ({
  size = 85,
  onRelease,
  setButtonPicLoaded,
}: {
  size?: number;
  onRelease?: (deltaThisTurn: number, newTotal: number) => void;
  setButtonPicLoaded: (loaded: boolean) => void;
}) => {
  const KNOB_STEP = 20;

  const totalRotation = useSharedValue(0);
  const dragRotation = useSharedValue(0);

  const startTotalRotation = useSharedValue(0);
  const prevRawAngle = useSharedValue(0);

  const unwrappedFingerAngle = useSharedValue(0);
  const startUnwrappedAngle = useSharedValue(0);

  // 记录“当前处于第几个 10° 台阶”
  const lastStep = useSharedValue(0);

  // 音效实例
  const soundPlayer = useAudioPlayer(ASSETS.buttonSpin);

  const handleReleaseOnJS = useCallback(
    (deltaThisTurn: number, newTotal: number) => {
      onRelease?.(deltaThisTurn, newTotal);
    },
    [onRelease],
  );

  const triggerFeedback = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    soundPlayer.seekTo(0);
    soundPlayer.play();
  };

  const panGesture = Gesture.Pan()
    .onStart((e) => {
      const centerX = size / 2;
      const centerY = size / 2;

      const dx = e.x - centerX;
      const dy = e.y - centerY;

      const angleRad = Math.atan2(dy, dx);
      const angleDeg = (angleRad * 180) / Math.PI;

      prevRawAngle.value = angleDeg;
      unwrappedFingerAngle.value = angleDeg;
      startUnwrappedAngle.value = angleDeg;

      startTotalRotation.value = totalRotation.value;

      dragRotation.value = 0;
      lastStep.value = 0; // 本次拖拽重新开始计算刻度
    })
    .onUpdate((e) => {
      const centerX = size / 2;
      const centerY = size / 2;

      const dx = e.x - centerX;
      const dy = e.y - centerY;

      const angleRad = Math.atan2(dy, dx);
      const angleDeg = (angleRad * 180) / Math.PI;

      let diff = angleDeg - prevRawAngle.value;

      if (diff > 180) {
        diff -= 360;
      } else if (diff < -180) {
        diff += 360;
      }

      unwrappedFingerAngle.value = unwrappedFingerAngle.value + diff;
      prevRawAngle.value = angleDeg;

      const deltaThisTurn = unwrappedFingerAngle.value - startUnwrappedAngle.value;

      dragRotation.value = deltaThisTurn;

      // ⭐ 每跨过一个 20° 的档位，震动 + 播放 buttonSpin
      const currentStep = Math.trunc(deltaThisTurn / KNOB_STEP);
      const previousStep = lastStep.value;

      if (currentStep !== previousStep) {
        const stepDiff = currentStep - previousStep;
        const stepsCrossed = Math.abs(stepDiff);

        for (let i = 0; i < stepsCrossed; i++) {
          runOnJS(triggerFeedback)();
        }

        lastStep.value = currentStep;
      }
    })
    .onEnd(() => {
      const newTotal = startTotalRotation.value + dragRotation.value;
      const deltaThisTurn = dragRotation.value;

      totalRotation.value = newTotal;
      dragRotation.value = 0;

      runOnJS(handleReleaseOnJS)(deltaThisTurn, newTotal);
    });

  const animatedStyle = useAnimatedStyle(() => {
    const currentDeg = totalRotation.value + dragRotation.value;
    return {
      transform: [
        {
          rotate: `${currentDeg}deg`,
        },
      ],
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          {
            position: "absolute",
            width: size,
            height: size,
            bottom: 55,
            zIndex: 2,
            marginLeft: 150,
          },
          animatedStyle,
        ]}
      >
        <Image
          source={ASSETS.gashaponMachineButton}
          style={{
            width: size,
            height: size,
          }}
          onLoad={() => setButtonPicLoaded(true)}
        />
      </Animated.View>
    </GestureDetector>
  );
};
