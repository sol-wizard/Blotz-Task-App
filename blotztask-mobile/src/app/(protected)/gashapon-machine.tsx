import React, { useRef, useEffect, useState } from "react";
import { View, Image, Text } from "react-native";
import Matter from "matter-js";
import { GameEngine } from "react-native-game-engine";
import { ASSETS } from "@/shared/constants/assets";
import { SafeAreaView } from "react-native-safe-area-context";
import { GameEntity } from "@/feature/gashapon-machine/models/game-entity";
import { PhysicsEntity } from "@/feature/gashapon-machine/models/physics-entity";
import { EntityMap } from "@/feature/gashapon-machine/models/entity-map";
import { CapsuleToyRenderer } from "@/feature/gashapon-machine/components/capsule-toy-renderer";
import { WallRenderer } from "@/feature/gashapon-machine/components/wall-renderer";

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

  useEffect(() => {
    const engine = Matter.Engine.create({ enableSleeping: false });
    const world = engine.world;
    world.gravity.y = 1;

    const floor = Matter.Bodies.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT, WORLD_WIDTH, 10, {
      isStatic: true,
    });

    const ceiling = Matter.Bodies.rectangle(WORLD_WIDTH / 2, 0, WORLD_WIDTH, 20, {
      isStatic: true,
    });

    const leftWall = Matter.Bodies.rectangle(0, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT, {
      isStatic: true,
    });

    const rightWall = Matter.Bodies.rectangle(WORLD_WIDTH, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT, {
      isStatic: true,
    });

    Matter.World.add(world, [floor, ceiling, leftWall, rightWall]);

    // 生成一堆圆形扭蛋
    const balls = [];
    let colCount = 5; // 5列 * 2行 = 10个
    let startX = 100; // 起始位置(可以调)
    let startY = 50;
    let gapX = BALL_RADIUS * 2;
    let gapY = BALL_RADIUS * 2;

    for (let i = 0; i < TOTAL_BALLS; i++) {
      const col = i % colCount;
      const row = Math.floor(i / colCount);

      const x = startX + col * gapX;
      const y = startY + row * gapY;

      const ball = Matter.Bodies.circle(x, y, BALL_RADIUS, {
        restitution: 0.6,
        friction: 0.05,
      });

      balls.push(ball);
    }

    Matter.World.add(world, balls);

    const newEntities: EntityMap = {
      physics: {
        engine: engine,
        world: world,
      },
      floor: {
        body: floor,
        renderer: WallRenderer,
        color: "#333",
      },
      ceiling: {
        body: ceiling,
        renderer: WallRenderer,
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

    // 把球也塞进 entities
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
        <GameEngine
          systems={[physicsSystem]}
          entities={entities}
          style={{
            width: WORLD_WIDTH,
            height: WORLD_HEIGHT,
            backgroundColor: "#fff",
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "#ccc",
          }}
        />
      ) : (
        <View>
          <Text>Loading Gashapon Machine...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
