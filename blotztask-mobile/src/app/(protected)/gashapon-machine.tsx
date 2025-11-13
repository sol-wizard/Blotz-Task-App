import React, { useRef, useState } from "react";
import { View, Image, Animated, StyleSheet, Easing, Dimensions } from "react-native";
import { GameEngine } from "react-native-game-engine";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGashaponMachineConfig } from "@/feature/gashapon-machine/hooks/useGashaponMachineConfig";
import { ASSETS } from "@/shared/constants/assets";
import { MachineButton } from "@/feature/gashapon-machine/components/machine-button";
import { cleanupSystem, physicsSystem } from "@/feature/gashapon-machine/utils/game-systems";
import { LinearGradient } from "expo-linear-gradient";
import { TaskRevealModal } from "@/feature/gashapon-machine/components/task-reveal-modal";
import LoadingScreen from "@/shared/components/ui/loading-screen";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const DROPOUT_X = SCREEN_WIDTH / 2 - 40; // 基本居中
const DROPOUT_Y = SCREEN_HEIGHT / 2 + 200; // 略偏下，自己调

export default function GashaponMachine() {
  const [basePicLoaded, setBasePicLoaded] = useState(false);
  const [buttonPicLoaded, setButtonPicLoaded] = useState(false);
  const [showDropStar, setShowDropStar] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);

  const handleDoNow = () => {
    console.log("Do it now pressed!");
  };

  const dimOpacity = useRef(new Animated.Value(0)).current;
  const rewardTranslateX = useRef(new Animated.Value(0)).current;
  const rewardTranslateY = useRef(new Animated.Value(0)).current;
  const rewardScale = useRef(new Animated.Value(1)).current;
  const rewardRotate = useRef(new Animated.Value(0)).current;

  const CENTER_X = 0;
  const CENTER_Y = 0;

  const handleBallDropped = () => {
    setShowDropStar(true);
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
      Animated.parallel([
        Animated.timing(rewardTranslateX, {
          toValue: CENTER_X,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rewardTranslateY, {
          toValue: CENTER_Y,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rewardRotate, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(true);
        setShowDropStar(false);
      });
    });
  };

  const { entities, handleRelease } = useGashaponMachineConfig({
    onBallDropped: handleBallDropped,
  });
  const gameEngineReady = !!entities.physics;
  const isAllLoaded = basePicLoaded && buttonPicLoaded && gameEngineReady;

  const rotate = rewardRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <LinearGradient
      colors={["#F3FDE8", "#EAFBFE", "#F3FDE8"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1 items-center justify-center">
        <TaskRevealModal
          visible={isModalVisible}
          taskTitle="Clean Up House"
          onClose={() => setModalVisible(false)}
          onDoNow={handleDoNow}
        />
        {!isAllLoaded && <LoadingScreen />}

        <View
          style={{
            width: 360,
            height: 520,
            opacity: isAllLoaded ? 1 : 0,
            pointerEvents: isAllLoaded ? "auto" : "none",
            position: isAllLoaded ? "relative" : "absolute",
          }}
          className="items-center justify-center"
        >
          <Image
            source={ASSETS.gashaponMachineBase}
            resizeMode="contain"
            className="absolute z-0"
            style={{
              alignSelf: "center",
              width: 600,
              height: 800,
            }}
            onLoad={() => setBasePicLoaded(true)}
          />
          <View
            style={{
              marginTop: 10,
            }}
          >
            {isAllLoaded && (
              <GameEngine
                systems={[physicsSystem, cleanupSystem]}
                running={isAllLoaded}
                entities={entities}
                style={{
                  width: 400,
                  height: 500,
                  zIndex: 1,
                  bottom: 100,
                }}
              />
            )}
          </View>

          <MachineButton setButtonPicLoaded={setButtonPicLoaded} onRelease={handleRelease} />
        </View>

        {showDropStar && (
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
              <Image source={ASSETS.yellowStar} resizeMode="contain" />
            </Animated.View>
          </>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}
