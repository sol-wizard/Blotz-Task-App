import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Image, ImageSourcePropType, Easing } from "react-native";
import { getLabelIcon } from "@/feature/star-spark/utils/get-label-icon";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type Point = {
  x: number;
  y: number;
};


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

  const latestTriggerRef = useRef<number>(0);
  const completionFiredForTriggerRef = useRef<number>(0);

  const rewardTranslateX = useRef(new Animated.Value(0)).current;
  const rewardTranslateY = useRef(new Animated.Value(0)).current;
  const rewardScale = useRef(new Animated.Value(1)).current;
  const rewardRotate = useRef(new Animated.Value(0)).current;
  const rewardOpacity = useRef(new Animated.Value(1)).current;

  const rotate = rewardRotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-360deg", "360deg"],
  });

  useEffect(() => {
    if (!trigger || !starLabelName) return;

    latestTriggerRef.current = trigger;
    // Allow completion for this trigger exactly once
    if (completionFiredForTriggerRef.current === trigger) {
      return;
    }

    const icon = getLabelIcon(starLabelName);

    setActiveStarIcon(icon);
    setIsAnimating(true);

    // Start from screen center (where modal was)
    rewardTranslateX.setValue(0);
    rewardTranslateY.setValue(0);
    rewardScale.setValue(1);
    rewardRotate.setValue(0);
    rewardOpacity.setValue(1);

    const fadeDuration = 90;

    // Match physics renderer size closely.
    // CapsuleToyRenderer uses width = BALL_RADIUS*3 where BALL_RADIUS=20 => 60px.
    // Our base image is 60x60, so end scale should be ~1.
    const endScale = 1;

    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(rewardScale, {
          toValue: endScale,
          duration: fadeDuration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rewardRotate, {
          toValue: 0.05,
          duration: fadeDuration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(rewardOpacity, {
        toValue: 0,
        duration: fadeDuration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    animation.start(() => {
      // Guard against late/duplicate callbacks from previous animations
      if (latestTriggerRef.current !== trigger) {
        return;
      }
      if (completionFiredForTriggerRef.current === trigger) {
        return;
      }
      completionFiredForTriggerRef.current = trigger;

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
    rewardOpacity,
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
            opacity: rewardOpacity,
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
