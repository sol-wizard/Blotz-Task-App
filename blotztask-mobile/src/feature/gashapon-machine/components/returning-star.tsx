import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Image, ImageSourcePropType, Easing } from "react-native";
import { getLabelIcon } from "@/feature/star-spark/utils/get-label-icon";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const MACHINE_ENTRY_X = SCREEN_WIDTH / 2 - 45;
const MACHINE_ENTRY_Y = SCREEN_HEIGHT / 2 - 170; // 机器顶部入口
const MACHINE_PILE_MIN_X = SCREEN_WIDTH / 2 - 130;
const MACHINE_PILE_MAX_X = SCREEN_WIDTH / 2 + 20;
const MACHINE_PILE_MIN_Y = SCREEN_HEIGHT / 2 + 70; // 初始化星星堆位置开始
const MACHINE_PILE_MAX_Y = SCREEN_HEIGHT / 2 + 170; // 初始化星星堆位置结束

type Point = {
  x: number;
  y: number;
};

type ReturnPath = {
  entry: Point;
  mid: Point;
  final: Point;
};

type SettledStar = {
  id: number;
  icon: ImageSourcePropType;
  position: Point;
  rotation: number;
  scale: number;
};

const MAX_SETTLED_STARS = 14;

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

const toRelative = (x: number, y: number): Point => ({
  x: x - SCREEN_WIDTH / 2,
  y: y - SCREEN_HEIGHT / 2,
});

const createReturnPath = (): ReturnPath => {
  const entryX = MACHINE_ENTRY_X + randomBetween(-20, 20);
  const entryY = MACHINE_ENTRY_Y + randomBetween(-20, 15);
  const midX = entryX + randomBetween(-60, 60);
  const midY = entryY + randomBetween(90, 130);
  const finalX = randomBetween(MACHINE_PILE_MIN_X, MACHINE_PILE_MAX_X);
  const finalY = randomBetween(MACHINE_PILE_MIN_Y, MACHINE_PILE_MAX_Y);

  return {
    entry: toRelative(entryX, entryY),
    mid: toRelative(midX, midY),
    final: toRelative(finalX, finalY),
  };
};

const createSettledStar = (position: Point, icon: ImageSourcePropType): SettledStar => ({
  id: Date.now() + Math.random(),
  icon,
  position,
  rotation: randomBetween(-25, 25),
  scale: randomBetween(0.85, 1.1),
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
  const [settledStars, setSettledStars] = useState<SettledStar[]>([]);

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
    const nextPath = createReturnPath();

    setActiveStarIcon(icon);
    setIsAnimating(true);

    rewardTranslateX.setValue(0);
    rewardTranslateY.setValue(0);
    rewardScale.setValue(1);
    rewardRotate.setValue(0);

    const entryDuration = 350;
    const dropToMidDuration = 420;
    const settleDuration = 520;
    const rotateDirection = Math.random() > 0.5 ? 1 : -1;

    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(rewardTranslateX, {
          toValue: nextPath.entry.x,
          duration: entryDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rewardTranslateY, {
          toValue: nextPath.entry.y,
          duration: entryDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rewardScale, {
          toValue: 0.85,
          duration: entryDuration,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(rewardTranslateX, {
            toValue: nextPath.mid.x,
            duration: dropToMidDuration,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(rewardTranslateX, {
            toValue: nextPath.final.x,
            speed: 8,
            bounciness: 4,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(rewardTranslateY, {
            toValue: nextPath.mid.y,
            duration: dropToMidDuration,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(rewardTranslateY, {
            toValue: nextPath.final.y,
            speed: 10,
            bounciness: 7,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(rewardRotate, {
          toValue: rotateDirection,
          duration: dropToMidDuration + settleDuration,
          useNativeDriver: true,
        }),
        Animated.timing(rewardScale, {
          toValue: 1.1,
          duration: dropToMidDuration + settleDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.spring(rewardScale, {
          toValue: 0.95,
          speed: 12,
          bounciness: 3,
          useNativeDriver: true,
        }),
        Animated.spring(rewardScale, {
          toValue: 1,
          speed: 12,
          bounciness: 3,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(400),
    ]);

    animation.start(() => {
      setIsAnimating(false);
      setActiveStarIcon(null);
      setSettledStars((prev) => {
        const next = [...prev, createSettledStar(nextPath.final, icon)];
        return next.slice(-MAX_SETTLED_STARS);
      });
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

  if (!isAnimating && settledStars.length === 0) return null;

  return (
    <>
      {settledStars.map((star) => (
        <Image
          key={star.id}
          pointerEvents="none"
          source={star.icon}
          style={{
            position: "absolute",
            width: 46,
            height: 46,
            left: SCREEN_WIDTH / 2 - 23 + star.position.x,
            top: SCREEN_HEIGHT / 2 - 23 + star.position.y,
            opacity: 0.85,
            transform: [{ rotate: `${star.rotation}deg` }, { scale: star.scale }],
            zIndex: 8,
          }}
        />
      ))}

      {isAnimating && activeStarIcon && (
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
