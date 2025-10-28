import React, { useRef, useEffect, useState } from "react";
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
    const engine = Matter.Engine.create({ enableSleeping: true });
    const world = engine.world;
    engine.gravity.y = 1;

    const x1 = 0;
    const y1 = 500;
    const x2 = 340;
    const y2 = 450;

    const centerX = (x1 + x2) / 2; // 170
    const centerY = (y1 + y2) / 2; // 475

    const angle = Math.atan2(y2 - y1, x2 - x1); // 计算倾斜角度（弧度）

    const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

    const floor = Matter.Bodies.rectangle(centerX, centerY, length, 10, {
      isStatic: true,
      friction: 1,
      frictionStatic: 1,
      restitution: 0,
      angle: angle, // 设置倾斜角度
    });

    const leftWall = Matter.Bodies.rectangle(0, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT, {
      isStatic: true,
    });

    const rightWall = Matter.Bodies.rectangle(WORLD_WIDTH, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT, {
      isStatic: true,
    });
    const ceiling = Matter.Bodies.rectangle(WORLD_WIDTH / 2, 0, WORLD_WIDTH, 20, {
      isStatic: true,
    });

    Matter.World.add(world, [floor, ceiling, leftWall, rightWall]);

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

            overflow: "hidden",
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
