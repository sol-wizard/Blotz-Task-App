import React, { useRef, useState } from "react";
import { View, Text, Image } from "react-native";
import Matter from "matter-js";
import { GameEngine } from "react-native-game-engine";
import { SafeAreaView } from "react-native-safe-area-context";
import { PhysicsEntity } from "@/feature/gashapon-machine/models/physics-entity";
import { EntityMap } from "@/feature/gashapon-machine/models/entity-map";
import { useGashaponMachineConfig } from "@/feature/gashapon-machine/hooks/useGashaponMachineConfig";
import { GameLoopArgs } from "@/feature/gashapon-machine/models/game-loop-args";
import { ASSETS } from "@/shared/constants/assets";
import { MachineButton } from "@/feature/gashapon-machine/components/machine-button";

export default function GashaponMachine() {
  const { entities, handleRelease } = useGashaponMachineConfig();
  const [basePicLoaded, setBasePicLoaded] = useState(false);
  const [buttonPicLoaded, setButtonPicLoaded] = useState(false);
  const isAllPicLoaded = basePicLoaded && buttonPicLoaded;

  const physicsSystem = (entities: EntityMap, { time }: GameLoopArgs) => {
    const physics = entities.physics as PhysicsEntity | undefined;

    if (!physics) {
      console.log("Physics engine not initialized yet.");
      return entities;
    }
    const MAX_DELTA = 1000 / 60;
    const dt = Math.min(time.delta, MAX_DELTA);

    Matter.Engine.update(physics.engine, dt);
    return entities;
  };

  return (
    <SafeAreaView className="flex-1 items-center">
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
                systems={[physicsSystem]}
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
  );
}
