import React, { useState } from "react";
import { View, Image } from "react-native";
import { GameEngine } from "react-native-game-engine";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGashaponMachineConfig } from "@/feature/gashapon-machine/hooks/useGashaponMachineConfig";
import { ASSETS } from "@/shared/constants/assets";
import { MachineButton } from "@/feature/gashapon-machine/components/machine-button";
import { cleanupSystem, physicsSystem } from "@/feature/gashapon-machine/utils/game-systems";
import { LinearGradient } from "expo-linear-gradient";
import { TaskRevealModal } from "@/feature/gashapon-machine/components/task-reveal-modal";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { DroppedStar } from "@/feature/gashapon-machine/components/dropped-star";

export default function GashaponMachine() {
  const [basePicLoaded, setBasePicLoaded] = useState(false);
  const [buttonPicLoaded, setButtonPicLoaded] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [dropStarTrigger, setDropStarTrigger] = useState(0);

  const handleDoNow = () => {
    console.log("Do it now pressed!");
  };
  const handleStarDropped = () => {
    setDropStarTrigger((prev) => prev + 1);
  };

  const { entities, handleRelease } = useGashaponMachineConfig({
    onStarDropped: handleStarDropped,
  });
  const gameEngineReady = !!entities.physics;
  const isAllLoaded = basePicLoaded && buttonPicLoaded && gameEngineReady;

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
            {gameEngineReady && (
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

        <DroppedStar
          trigger={dropStarTrigger}
          setTaskRevealModalVisible={() => {
            setModalVisible(true);
          }}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}
