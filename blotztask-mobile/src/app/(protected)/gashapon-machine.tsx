import React, { useState } from "react";
import { View, Text, Image } from "react-native";
import { GameEngine } from "react-native-game-engine";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGashaponMachineConfig } from "@/feature/gashapon-machine/hooks/useGashaponMachineConfig";
import { ASSETS } from "@/shared/constants/assets";
import { MachineButton } from "@/feature/gashapon-machine/components/machine-button";
import { cleanupSystem, physicsSystem } from "@/feature/gashapon-machine/utils/game-systems";
import { LinearGradient } from "expo-linear-gradient";
import { TaskRevealModal } from "@/feature/gashapon-machine/components/task-reveal-modal";

export default function GashaponMachine() {
  const [basePicLoaded, setBasePicLoaded] = useState(false);
  const [buttonPicLoaded, setButtonPicLoaded] = useState(false);
  const isAllPicLoaded = basePicLoaded && buttonPicLoaded;

  const [isModalVisible, setModalVisible] = useState(false);
  const { entities, handleRelease } = useGashaponMachineConfig({ setModalVisible });

  const handleDoNow = () => {
    console.log("Do it now pressed!");
  };

  return (
    <LinearGradient
      colors={["#F3FDE8", "#EAFBFE", "#F3FDE8"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1 items-center">
        <TaskRevealModal
          visible={isModalVisible}
          taskTitle="Clean Up House"
          onClose={() => setModalVisible(false)}
          onDoNow={handleDoNow}
        />
        {entities.physics ? (
          <>
            <Image
              source={ASSETS.gashaponMachineBase}
              resizeMode="contain"
              className="absolute z-0"
              style={{
                top: 20,
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
              {isAllPicLoaded && (
                <GameEngine
                  systems={[physicsSystem, cleanupSystem]}
                  running={isAllPicLoaded}
                  entities={entities}
                  style={{
                    width: 400,
                    height: 500,
                    zIndex: 1,
                  }}
                />
              )}
            </View>

            <MachineButton setButtonPicLoaded={setButtonPicLoaded} onRelease={handleRelease} />
          </>
        ) : (
          <View>
            <Text>Loading Gashapon Machine...</Text>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}
