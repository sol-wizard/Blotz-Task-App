import React, { useEffect, useMemo, useRef } from "react";
import { Image } from "react-native";
import { Animated, Dimensions, StyleSheet, Easing, ImageSourcePropType } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const DROPOUT_X = SCREEN_WIDTH / 2 - 40;
const DROPOUT_Y = SCREEN_HEIGHT / 2 + 200;

interface DroppedStarProps {
  trigger: number;
  setTaskRevealModalVisible: (v: boolean) => void;
  imageSource: ImageSourcePropType;
}

export const DroppedStar: React.FC<DroppedStarProps> = ({
  trigger,
  setTaskRevealModalVisible,
  imageSource,
}) => {
  const dimOpacityRef = useRef(new Animated.Value(0));
  const starOpacity = useRef(new Animated.Value(0));
  const rewardTranslateX = useRef(new Animated.Value(0));
  const rewardTranslateY = useRef(new Animated.Value(0));
  const rewardScale = useRef(new Animated.Value(1));
  const rewardRotate = useRef(new Animated.Value(0));

  const CENTER_X = 0;
  const CENTER_Y = 0;

  const rotate = useMemo(
    () =>
      rewardRotate.current.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
      }),
    [],
  );

  useEffect(() => {
    if (!trigger) return;

    starOpacity.current.setValue(1);

    dimOpacityRef.current.setValue(0);
    rewardScale.current.setValue(1);
    rewardRotate.current.setValue(0);

    rewardTranslateX.current.setValue(DROPOUT_X - SCREEN_WIDTH / 2);
    rewardTranslateY.current.setValue(DROPOUT_Y - SCREEN_HEIGHT / 2);

    Animated.parallel([
      Animated.timing(dimOpacityRef.current, {
        toValue: 0.7,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(rewardScale.current, {
          toValue: 1.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(rewardScale.current, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      const MOVE_DURATION = 800;

      Animated.parallel([
        Animated.timing(rewardTranslateX.current, {
          toValue: CENTER_X,
          duration: MOVE_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rewardTranslateY.current, {
          toValue: CENTER_Y,
          duration: MOVE_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rewardRotate.current, {
          toValue: 1,
          duration: MOVE_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTaskRevealModalVisible(true);
        starOpacity.current.setValue(0);
        dimOpacityRef.current.setValue(0);
      });
    });
  }, [trigger]);

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: "black",
            opacity: dimOpacityRef.current,
            zIndex: 20,
          },
        ]}
      />

      <Animated.View
        style={{
          position: "absolute",
          width: 100,
          height: 100,
          left: SCREEN_WIDTH / 2 - 50,
          top: SCREEN_HEIGHT / 2 - 50,
          zIndex: 30,
          opacity: starOpacity.current,
          transform: [
            { translateX: rewardTranslateX.current },
            { translateY: rewardTranslateY.current },
            { scale: rewardScale.current },
            { rotate },
          ],
          shadowColor: "#FFFFFF",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 20,
          elevation: 10,
        }}
      >
        <Image
          source={imageSource}
          style={{
            width: 60,
            height: 60,
          }}
        />
      </Animated.View>
    </>
  );
};
