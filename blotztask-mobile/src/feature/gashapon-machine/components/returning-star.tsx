import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Image, ImageSourcePropType, Easing } from "react-native";
import { getLabelIcon } from "@/feature/star-spark/utils/get-label-icon";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Machine top entry point (where star enters before physics takes over)
const MACHINE_ENTRY_X = SCREEN_WIDTH / 2 - 45;
const MACHINE_ENTRY_Y = SCREEN_HEIGHT / 2 - 170;

type Point = {
  x: number;
  y: number;
};

// Convert absolute position to relative (for Animated transform from screen center)
const toRelative = (x: number, y: number): Point => ({
  x: x - SCREEN_WIDTH / 2,
  y: y - SCREEN_HEIGHT / 2,
});

interface ReturningStarProps {
  starLabelName: string;
  trigger: number;
  onAnimationComplete: () => void;
}

export const ReturningStarAnimations: React.FC<ReturningStarProps> = ({
  starLabelName,
  trigger,
  onAnimationComplete,
}) => {
  const [activeStarIcon, setActiveStarIcon] = useState<ImageSourcePropType | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const rewardTranslateX = useRef(new Animated.Value(0)).current;
  const rewardTranslateY = useRef(new Animated.Value(0)).current;
  const rewardScale = useRef(new Animated.Value(1)).current;
  const rewardRotate = useRef(new Animated.Value(0)).current;

  const rotate = rewardRotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-360deg", "360deg"],
  });

  useEffect(() => {
    if (!trigger || !starLabelName) return;

    const icon = getLabelIcon(starLabelName);
    // Target: machine entry point (top of machine)
    const entryPoint = toRelative(MACHINE_ENTRY_X, MACHINE_ENTRY_Y);

    setActiveStarIcon(icon);
    setIsAnimating(true);

    // Start from screen center (where modal was)
    rewardTranslateX.setValue(0);
    rewardTranslateY.setValue(0);
    rewardScale.setValue(1);
    rewardRotate.setValue(0);

    const moveDuration = 500;

    // Simple animation: move from center to machine top entry, then let physics take over
    const animation = Animated.parallel([
      Animated.timing(rewardTranslateX, {
        toValue: entryPoint.x,
        duration: moveDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rewardTranslateY, {
        toValue: entryPoint.y,
        duration: moveDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rewardScale, {
        toValue: 0.6, // Shrink to match physics star size
        duration: moveDuration,
        useNativeDriver: true,
      }),
      Animated.timing(rewardRotate, {
        toValue: 0.5,
        duration: moveDuration,
        useNativeDriver: true,
      }),
    ]);

    animation.start(() => {
      setIsAnimating(false);
      setActiveStarIcon(null);
      // Physics will handle the natural drop into the pile
      onAnimationComplete();
    });

    return () => {
      animation.stop();
    };
  }, [
    trigger,
    starLabelName,
    onAnimationComplete,
    rewardRotate,
    rewardScale,
    rewardTranslateX,
    rewardTranslateY,
  ]);

  if (!isAnimating) return null;

  return (
    <>
      {activeStarIcon && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 100,
            height: 100,
            left: SCREEN_WIDTH / 2 - 50,
            top: SCREEN_HEIGHT / 2 - 50,
            zIndex: 30,
            transform: [
              { translateX: rewardTranslateX },
              { translateY: rewardTranslateY },
              { scale: rewardScale },
              { rotate },
            ],
            shadowColor: "#FFFFFF",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: 15,
            elevation: 10,
          }}
        >
          <Image
            source={activeStarIcon}
            style={{
              width: 60,
              height: 60,
            }}
          />
        </Animated.View>
      )}
    </>
  );
};
