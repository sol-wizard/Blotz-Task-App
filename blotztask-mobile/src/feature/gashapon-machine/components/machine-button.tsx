import React, { useCallback } from "react";
import { Image } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
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
  const totalRotation = useSharedValue(0);

  const dragRotation = useSharedValue(0);

  const startTotalRotation = useSharedValue(0);
  const prevRawAngle = useSharedValue(0);

  const unwrappedFingerAngle = useSharedValue(0);

  const startUnwrappedAngle = useSharedValue(0);

  const handleReleaseOnJS = useCallback(
    (deltaThisTurn: number, newTotal: number) => {
      onRelease?.(deltaThisTurn, newTotal);
    },
    [onRelease],
  );

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
            bottom: 225,
            zIndex: 2,
            marginLeft: 148,
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
