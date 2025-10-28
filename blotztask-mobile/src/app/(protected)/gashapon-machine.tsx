import React from "react";
import { View, Text } from "react-native";
import Matter from "matter-js";
import { GameEngine } from "react-native-game-engine";
import { SafeAreaView } from "react-native-safe-area-context";
import { PhysicsEntity } from "@/feature/gashapon-machine/models/physics-entity";
import { EntityMap } from "@/feature/gashapon-machine/models/entity-map";
import { MachineButton } from "@/feature/gashapon-machine/components/machine-button";
import { useSharedValue } from "react-native-reanimated";
import { useGashaponMachineConfig } from "@/feature/gashapon-machine/hooks/useGashaponMachineConfig";
import { GameLoopArgs } from "@/feature/gashapon-machine/models/game-loop-args";

export default function GashaponMachine() {
  const worldWidth = 340;
  const worldHeight = 500;

  const { entities, gateRef, isGateOpenRef, ballPassedRef } = useGashaponMachineConfig({
    worldWidth,
    worldHeight,
  });

  const totalRotation = useSharedValue(0);

  const handleRelease = (deltaThisTurn: number) => {
    if (Math.abs(deltaThisTurn) > 60) {
      console.log("Release a Gachapon!");

      if (gateRef.current && !isGateOpenRef.current) {
        Matter.Body.translate(gateRef.current, { x: 80, y: 0 });
        isGateOpenRef.current = true;
        ballPassedRef.current = false;

        console.log("gate is opened");
      }
    }
  };

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
    <SafeAreaView className="flex-1 items-center justify-center m-12">
      {entities.physics ? (
        <>
          <GameEngine
            systems={[physicsSystem]}
            entities={entities}
            style={{
              width: worldWidth,
              height: worldHeight,
              overflow: "hidden",
            }}
          />
          <MachineButton totalRotation={totalRotation} onRelease={handleRelease} />
        </>
      ) : (
        <View>
          <Text>Loading Gashapon Machine...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
