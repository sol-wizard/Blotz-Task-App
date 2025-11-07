import Matter from "matter-js";
import { useEffect, useRef, useState } from "react";
import { createRectangleBetweenPoints } from "../utils/create-rectangle-between-points";
import { EntityMap } from "../models/entity-map";
import { ASSETS } from "@/shared/constants/assets";
import { CapsuleToyRenderer } from "../components/capsule-toy-renderer";
import { wallPoints } from "../utils/gashapon-inner-wall-points";
import { isGameEntity } from "../utils/entity-map";
import { WallRenderer } from "../components/wall-renderer";
import { GateRenderer } from "../components/gate-renderer";
import { Accelerometer } from "expo-sensors";

export const useGashaponMachineConfig = ({
  ballRadius = 22,
  totalBalls = 10,
}: {
  ballRadius?: number;
  totalBalls?: number;
} = {}) => {
  const eggImages = Array(totalBalls).fill(ASSETS.capsuleToy);

  const [entities, setEntities] = useState<EntityMap>({});

  const gateRef = useRef<Matter.Body | null>(null);
  const worldRef = useRef<Matter.World | null>(null);
  const ballsRef = useRef<Matter.Body[]>([]);
  const isGateOpenRef = useRef(false);
  const ballPassedRef = useRef(false);

  const handleRelease = (deltaThisTurn: number) => {
    if (Math.abs(deltaThisTurn) > 60) {
      console.log("Release a Gachapon!");
      if (gateRef.current && !isGateOpenRef.current) {
        Matter.Body.translate(gateRef.current, { x: -80, y: 0 });
        isGateOpenRef.current = true;
        console.log("gate is opened");
      }
    }
  };
  const closeGate = () => {
    if (gateRef.current && isGateOpenRef.current) {
      console.log("close gate");
      Matter.Body.translate(gateRef.current, { x: 80, y: 0 });
      isGateOpenRef.current = false;
      ballPassedRef.current = false;
    }
  };

  useEffect(() => {
    const engine = Matter.Engine.create({ enableSleeping: false });
    const world = engine.world;
    worldRef.current = world;

    engine.gravity.y = 0.6;

    const wallBodies: Matter.Body[] = [];

    for (let i = 0; i < wallPoints.length - 1; i++) {
      const p1 = wallPoints[i];
      const p2 = wallPoints[i + 1];
      if (i >= 13 && i <= 16) {
        continue;
      }

      const segment = createRectangleBetweenPoints({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        thickness: 13,
      });
      segment.label = `wall-${i}`;

      wallBodies.push(segment);
    }

    Matter.World.add(world, [...wallBodies]);

    const gate = createRectangleBetweenPoints({
      x1: 166.172,
      y1: 449,
      x2: 100,
      y2: 438.02,
    });
    gateRef.current = gate;
    Matter.World.add(world, gate);

    const sensor = createRectangleBetweenPoints({
      x1: 166.172,
      y1: 490,
      x2: 124.11,
      y2: 480,
      thickness: 20,
      options: {
        label: "dropSensor",
        isStatic: true,
        isSensor: true,
      },
    });

    Matter.World.add(world, sensor);

    const balls: Matter.Body[] = [];

    const gapX = ballRadius * 2 + 5;
    const gapY = ballRadius * 2 + 5;

    for (let i = 0; i < totalBalls; i++) {
      const col = i % 5;
      const row = Math.floor(i / 5);

      let x = 90 + col * gapX;
      let y = 200 + row * gapY;

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
    ballsRef.current = balls;

    const newEntities: EntityMap = {
      physics: {
        engine: engine,
        world: world,
      },
    };

    balls.forEach((ball, idx) => {
      newEntities["ball-" + idx] = {
        body: ball,
        texture: eggImages[idx % eggImages.length],
        renderer: CapsuleToyRenderer,
      };
    });

    setEntities(newEntities);
    Matter.Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        const ball = bodyA.label.startsWith("ball")
          ? bodyA
          : bodyB.label.startsWith("ball")
            ? bodyB
            : null;
        const sensor = bodyA.label === "dropSensor" || bodyB.label === "dropSensor";

        if (ball && sensor) {
          console.log(`⚡ Ball ${ball.label} passed sensor, removing`);
          ballPassedRef.current = true;
          closeGate();
        }
      });
    });

    Accelerometer.setUpdateInterval(16);

    const subscription = Accelerometer.addListener((accelerometerData) => {
      const { x, y } = accelerometerData;

      ballsRef.current.forEach((ball) => {
        if (ball && worldRef.current) {
          const ballExists = worldRef.current.bodies.includes(ball);
          if (ballExists) {
            const gravityStrength = 1.5;
            engine.gravity.x = x * gravityStrength;
            engine.gravity.y = -y * gravityStrength;
          }
        }
      });
    });

    return () => {
      subscription.remove();
      Matter.Events.off(engine, "collisionStart");
      Matter.World.clear(world, false);
      Matter.Engine.clear(engine);
    };
  }, []);

  return { entities, handleRelease };
};
