import React, { useRef, useEffect, useState, useCallback } from "react";
import { View, Text } from "react-native";
import Matter from "matter-js";
import { GameEngine } from "react-native-game-engine";
import { ASSETS } from "@/shared/constants/assets";
import { SafeAreaView } from "react-native-safe-area-context";
import { PhysicsEntity } from "@/feature/gashapon-machine/models/physics-entity";
import { EntityMap } from "@/feature/gashapon-machine/models/entity-map";
import { CapsuleToyRenderer } from "@/feature/gashapon-machine/components/capsule-toy-renderer";
import { WallRenderer } from "@/feature/gashapon-machine/components/wall-renderer";
import { FloorRenderer } from "@/feature/gashapon-machine/components/floor-render";
import { MachineButton } from "@/feature/gashapon-machine/components/machine-button";
import { useSharedValue } from "react-native-reanimated";
import { createRectangleBetweenPoints } from "@/feature/gashapon-machine/utils/create-rectangle-between-points";

type GameLoopArgs = {
  time: {
    delta: number;
  };
};

// ----- CONFIG -----
const WORLD_WIDTH = 340;
const WORLD_HEIGHT = 500;

const BALL_RADIUS = 30;
const TOTAL_BALLS = 10;

const eggImages = Array(TOTAL_BALLS).fill(ASSETS.capsuleToy);

export default function GashaponMachine() {
  const engineRef = useRef<Matter.Engine | null>(null);
  const [entities, setEntities] = useState<EntityMap>({});

  const totalRotation = useSharedValue(0);

  const handleRelease = useCallback((deltaThisTurn: number, newTotal: number) => {
    console.log("这次拧了多少度:", deltaThisTurn);
    console.log("现在的累积角度是多少:", newTotal);
    if (deltaThisTurn > 60) {
      dropOneCapsule();
    }
  }, []);
  const dropOneCapsule = () => {
    console.log("放出一个扭蛋！");
  };

  useEffect(() => {
    const engine = Matter.Engine.create({ enableSleeping: true });
    const world = engine.world;
    engine.gravity.y = 1;

    const floor = createRectangleBetweenPoints({
      x1: 80,
      y1: 500,
      x2: 340,
      y2: 450,
    });

    // gate: 从 (0,500) 到 (80,500)
    const gate = createRectangleBetweenPoints({
      x1: 0,
      y1: 500,
      x2: 80,
      y2: 500,
    });

    const leftWall = Matter.Bodies.rectangle(0, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT, {
      isStatic: true,
    });

    const rightWall = Matter.Bodies.rectangle(
      WORLD_WIDTH,
      WORLD_HEIGHT / 2,
      20,
      WORLD_HEIGHT - 50,
      {
        isStatic: true,
      },
    );
    const ceiling = Matter.Bodies.rectangle(WORLD_WIDTH / 2, 0, WORLD_WIDTH, 20, {
      isStatic: true,
    });

    Matter.World.add(world, [floor, ceiling, leftWall, rightWall, gate]);

    // 生成一堆圆形扭蛋
    const balls = [];
    let colCount = 5; // 5列 * 2行 = 10个
    let startX = 100; // 起始位置(可以调)
    let startY = 50;
    let gapX = BALL_RADIUS * 2 + 5;
    let gapY = BALL_RADIUS * 2 + 5;

    for (let i = 0; i < TOTAL_BALLS; i++) {
      const col = i % colCount;
      const row = Math.floor(i / colCount);

      const x = startX + col * gapX;
      const y = startY + row * gapY;

      const ball = Matter.Bodies.circle(x, y, BALL_RADIUS, {
        restitution: 0.4,
        friction: 0.05,
        frictionStatic: 0.5,
        frictionAir: 0.01,
        sleepThreshold: 30,
      });

      balls.push(ball);
    }

    Matter.World.add(world, balls);

    const newEntities: EntityMap = {
      physics: {
        engine: engine,
        world: world,
      },
      gate: {
        body: gate,
        renderer: WallRenderer,
        color: "#333",
      },
      ceiling: {
        body: ceiling,
        renderer: WallRenderer,
        color: "#333",
      },
      floor: {
        body: floor,
        renderer: FloorRenderer,
        color: "#333",
      },
      leftWall: {
        body: leftWall,
        renderer: WallRenderer,
        color: "#333",
      },
      rightWall: {
        body: rightWall,
        renderer: WallRenderer,
        color: "#333",
      },
    };

    balls.forEach((ball, idx) => {
      newEntities["egg-" + idx] = {
        body: ball,
        texture: eggImages[idx % eggImages.length],
        renderer: CapsuleToyRenderer,
      };
    });

    setEntities(newEntities);
    engineRef.current = engine;
  }, []);

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
    <SafeAreaView
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 50,
      }}
    >
      {entities.physics ? (
        <>
          <GameEngine
            systems={[physicsSystem]}
            entities={entities}
            style={{
              width: WORLD_WIDTH,
              height: WORLD_HEIGHT,

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
