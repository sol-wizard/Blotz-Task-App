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
  const gateRef = useRef<Matter.Body | null>(null);
  const sensorRef = useRef<Matter.Body | null>(null);
  const isGateOpenRef = useRef(false);
  const ballPassedRef = useRef(false);

  const [entities, setEntities] = useState<EntityMap>({});

  const totalRotation = useSharedValue(0);

  const handleRelease = useCallback((deltaThisTurn: number, newTotal: number) => {
    console.log("这次拧了多少度:", deltaThisTurn);
    console.log("现在的累积角度是多少:", newTotal);

    if (Math.abs(deltaThisTurn) > 60) {
      dropOneCapsule();
    }
  }, []);

  const closeGate = useCallback(() => {
    if (gateRef.current && isGateOpenRef.current) {
      console.log("关闭 gate");
      Matter.Body.translate(gateRef.current, { x: -80, y: 0 });
      isGateOpenRef.current = false;
      ballPassedRef.current = false;
    }
  }, []);

  const dropOneCapsule = useCallback(() => {
    console.log("放出一个扭蛋！");

    if (gateRef.current && !isGateOpenRef.current) {
      // 向右平移 80 个单位
      Matter.Body.translate(gateRef.current, { x: 80, y: 0 });
      isGateOpenRef.current = true;
      ballPassedRef.current = false;

      console.log("gate 已打开");
    }
  }, []);

  useEffect(() => {
    const engine = Matter.Engine.create({ enableSleeping: false });
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

    // 创建传感器：在 gate 下方的检测区域

    const sensor = Matter.Bodies.rectangle(
      40, // gate 中心位置
      540, // ✅ 从 510 改为 540（下移 30 像素，大约一个球的直径）
      80, // 宽度与 gate 相同
      20, // 高度
      {
        isStatic: true,
        isSensor: true,
        label: "dropSensor",
      },
    );

    // 保存引用
    gateRef.current = gate;
    sensorRef.current = sensor;

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

    Matter.World.add(world, [floor, ceiling, leftWall, rightWall, gate, sensor]);

    // 生成一堆圆形扭蛋
    const balls = [];
    let colCount = 5;
    let startX = 100;
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
        label: `ball-${i}`, // 添加标签以便识别
      });

      balls.push(ball);
    }

    Matter.World.add(world, balls);

    // ✅ 监听碰撞事件
    Matter.Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;

        // 检查是否是球与传感器的碰撞
        const isSensorCollision =
          (bodyA.label === "dropSensor" && bodyB.label?.startsWith("ball")) ||
          (bodyB.label === "dropSensor" && bodyA.label?.startsWith("ball"));

        if (isSensorCollision && isGateOpenRef.current && !ballPassedRef.current) {
          console.log("检测到小球通过！");
          ballPassedRef.current = true;

          // 立即关闭 gate
          closeGate();
        }
      });
    });

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
      // 可选：如果想看到传感器位置（调试用）
      // sensor: {
      //   body: sensor,
      //   renderer: WallRenderer,
      //   color: "rgba(255, 0, 0, 0.3)",
      // },
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

    // 清理函数
    return () => {
      Matter.Events.off(engine, "collisionStart");
    };
  }, [closeGate]);

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
