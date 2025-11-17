import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, StyleSheet, Image, Easing } from "react-native";
import { getLabelIcon } from "@/feature/star-spark/utils/get-label-icon";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const DROPOUT_X = SCREEN_WIDTH / 2 - 40;
const DROPOUT_Y = SCREEN_HEIGHT / 2 + 200;

interface DroppedStarProps {
  starLabelName: string;
  trigger: number;
  setTaskRevealModalVisible: (v: boolean) => void;
}

export const DroppedStar: React.FC<DroppedStarProps> = ({
  starLabelName,
  trigger,
  setTaskRevealModalVisible,
}) => {
  const imageSource = getLabelIcon(starLabelName);
  const [visible, setVisible] = useState(false);

  const dimOpacity = useRef(new Animated.Value(0)).current;
  const rewardTranslateX = useRef(new Animated.Value(0)).current;
  const rewardTranslateY = useRef(new Animated.Value(0)).current;
  const rewardScale = useRef(new Animated.Value(1)).current;
  const rewardRotate = useRef(new Animated.Value(0)).current;

  const CENTER_X = 0;
  const CENTER_Y = 0;

  const rotate = rewardRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  useEffect(() => {
    if (!trigger) return;

    setVisible(true);

    dimOpacity.setValue(0);
    rewardScale.setValue(1);
    rewardRotate.setValue(0);

    rewardTranslateX.setValue(DROPOUT_X - SCREEN_WIDTH / 2);
    rewardTranslateY.setValue(DROPOUT_Y - SCREEN_HEIGHT / 2);

    Animated.parallel([
      Animated.timing(dimOpacity, {
        toValue: 0.7,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(rewardScale, {
          toValue: 1.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(rewardScale, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      const MOVE_DURATION = 800;

      Animated.parallel([
        Animated.timing(rewardTranslateX, {
          toValue: CENTER_X,
          duration: MOVE_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rewardTranslateY, {
          toValue: CENTER_Y,
          duration: MOVE_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rewardRotate, {
          toValue: 1,
          duration: MOVE_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTaskRevealModalVisible(true);
        setVisible(false);
        dimOpacity.setValue(0);
      });
    });
  }, [trigger]);

  if (!visible) return null;

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: "black",
            opacity: dimOpacity,
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
          transform: [
            { translateX: rewardTranslateX },
            { translateY: rewardTranslateY },
            { scale: rewardScale },
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
