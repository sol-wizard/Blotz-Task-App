import React from "react";
import { View, Text, Image } from "react-native";
import Matter from "matter-js";
import { GameEngine } from "react-native-game-engine";
import { SafeAreaView } from "react-native-safe-area-context";
import { PhysicsEntity } from "@/feature/gashapon-machine/models/physics-entity";
import { EntityMap } from "@/feature/gashapon-machine/models/entity-map";
import { useGashaponMachineConfig } from "@/feature/gashapon-machine/hooks/useGashaponMachineConfig";
import { GameLoopArgs } from "@/feature/gashapon-machine/models/game-loop-args";
import { ASSETS } from "@/shared/constants/assets";

export default function GashaponMachine() {
  const { entities } = useGashaponMachineConfig();

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
    <SafeAreaView className="flex-1 items-center justify-center my-12">
      {entities.physics ? (
        <>
          <Image
            source={ASSETS.gashaponMachine}
            resizeMode="contain"
            className="absolute scale-110 ml-4 z-0"
          />
          <GameEngine
            systems={[physicsSystem]}
            entities={entities}
            style={{
              width: 400,
              height: 500,
              zIndex: 1,
            }}
          />

          {/* <MachineButton onRelease={handleRelease} /> */}
        </>
      ) : (
        <View>
          <Text>Loading Gashapon Machine...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
