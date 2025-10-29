import Matter from "matter-js";
import { useEffect, useRef, useState } from "react";
import { createRectangleBetweenPoints } from "../utils/create-rectangle-between-points";
import { EntityMap } from "../models/entity-map";
import { WallRenderer } from "../components/wall-renderer";
import { FloorRenderer } from "../components/floor-render";
import { ASSETS } from "@/shared/constants/assets";
import { CapsuleToyRenderer } from "../components/capsule-toy-renderer";

export const useGashaponMachineConfig = ({
  worldWidth = 340,
  worldHeight = 500,
  ballRadius = 30,
  totalBalls = 10,
}: {
  worldWidth?: number;
  worldHeight?: number;
  ballRadius?: number;
  totalBalls?: number;
} = {}) => {
  const eggImages = Array(totalBalls).fill(ASSETS.capsuleToy);

  const gateRef = useRef<Matter.Body | null>(null);

  const isGateOpenRef = useRef(false);
  const ballPassedRef = useRef(false);

  const [entities, setEntities] = useState<EntityMap>({});

  const handleRelease = (deltaThisTurn: number) => {
    if (Math.abs(deltaThisTurn) > 60) {
      console.log("Release a Gachapon!");

      if (gateRef.current && !isGateOpenRef.current) {
        Matter.Body.translate(gateRef.current, { x: 80, y: 0 });
        isGateOpenRef.current = true;
        console.log("gate is opened");
      }
    }
  };

  const closeGate = () => {
    if (gateRef.current && isGateOpenRef.current) {
      console.log("close gate");
      Matter.Body.translate(gateRef.current, { x: -80, y: 0 });
      isGateOpenRef.current = false;
      ballPassedRef.current = false;
    }
  };

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

    const gate = createRectangleBetweenPoints({
      x1: 0,
      y1: 500,
      x2: 80,
      y2: 500,
    });

    const sensor = Matter.Bodies.rectangle(40, 540, 80, 20, {
      isStatic: true,
      isSensor: true,
      label: "dropSensor",
    });

    gateRef.current = gate;

    const leftWall = Matter.Bodies.rectangle(0, worldHeight / 2, 20, worldHeight, {
      isStatic: true,
    });

    const rightWall = Matter.Bodies.rectangle(worldWidth, worldHeight / 2, 20, worldHeight - 50, {
      isStatic: true,
    });

    const ceiling = Matter.Bodies.rectangle(worldWidth / 2, 0, worldWidth, 20, {
      isStatic: true,
    });

    Matter.World.add(world, [floor, ceiling, leftWall, rightWall, gate, sensor]);

    const balls = [];
    const colCount = 5;
    const startX = 100;
    const startY = 50;
    const gapX = ballRadius * 2 + 5;
    const gapY = ballRadius * 2 + 5;

    for (let i = 0; i < totalBalls; i++) {
      const col = i % colCount;
      const row = Math.floor(i / colCount);

      const x = startX + col * gapX;
      const y = startY + row * gapY;

      const ball = Matter.Bodies.circle(x, y, ballRadius, {
        restitution: 0.4,
        friction: 0.05,
        frictionStatic: 0.5,
        frictionAir: 0.01,
        label: `ball-${i}`,
      });

      balls.push(ball);
    }

    Matter.World.add(world, balls);

    Matter.Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;

        const isSensorCollision =
          (bodyA.label === "dropSensor" && bodyB.label?.startsWith("ball")) ||
          (bodyB.label === "dropSensor" && bodyA.label?.startsWith("ball"));

        if (isSensorCollision && isGateOpenRef.current && !ballPassedRef.current) {
          console.log("Detected the ball passing!");
          ballPassedRef.current = true;

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
    };

    balls.forEach((ball, idx) => {
      newEntities["egg-" + idx] = {
        body: ball,
        texture: eggImages[idx % eggImages.length],
        renderer: CapsuleToyRenderer,
      };
    });

    setEntities(newEntities);

    return () => {
      Matter.Events.off(engine, "collisionStart");
    };
  }, []);

  return { entities, gateRef, isGateOpenRef, handleRelease };
};
