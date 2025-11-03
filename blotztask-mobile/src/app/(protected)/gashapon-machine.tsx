import React from "react";
import { View, Text, Image } from "react-native";
import Matter from "matter-js";
import { GameEngine } from "react-native-game-engine";
import { SafeAreaView } from "react-native-safe-area-context";
import { PhysicsEntity } from "@/feature/gashapon-machine/models/physics-entity";
import { EntityMap } from "@/feature/gashapon-machine/models/entity-map";
import { MachineButton } from "@/feature/gashapon-machine/components/machine-button";
import { useGashaponMachineConfig } from "@/feature/gashapon-machine/hooks/useGashaponMachineConfig";
import { GameLoopArgs } from "@/feature/gashapon-machine/models/game-loop-args";
import { ASSETS } from "@/shared/constants/assets";

export default function GashaponMachine() {
  const { entities, handleRelease } = useGashaponMachineConfig();

  const physicsSystem = (entities: EntityMap, { time }: GameLoopArgs) => {
    const physics = entities.physics as PhysicsEntity | undefined;

    if (!physics) {
      console.log("Physics engine not initialized yet.");
      return entities;
    }
    Matter.Engine.update(physics.engine, time.delta);
    return entities;
  };

  return (
    <SafeAreaView className="flex-1 items-center justify-center my-12">
      {entities.physics ? (
        <>
          <GameEngine
            systems={[physicsSystem]}
            entities={entities}
            style={{
              width: 400,
              height: 500,
              overflow: "hidden",
            }}
          />

          <Image
            source={ASSETS.gashaponMachine} // 替换成你的机器图
            resizeMode="contain"
            className="absolute z-10 mb-11 scale-110 ml-9"
          />

          <MachineButton onRelease={handleRelease} />
        </>
      ) : (
        <View>
          <Text>Loading Gashapon Machine...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
