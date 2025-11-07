import Matter from "matter-js";
import { useEffect, useRef, useState } from "react";
import { createRectangleBetweenPoints } from "../utils/create-rectangle-between-points";
import { EntityMap } from "../models/entity-map";
import { ASSETS } from "@/shared/constants/assets";
import { CapsuleToyRenderer } from "../components/capsule-toy-renderer";
import { wallPoints } from "../utils/gashapon-inner-wall-points";
import { Accelerometer } from "expo-sensors";

export const useGashaponMachineConfig = ({
  ballRadius = 18,
  totalBalls = 10,
  setModalVisible,
}: {
  ballRadius?: number;
  totalBalls?: number;
  setModalVisible: (visible: boolean) => void;
}) => {
  const starImages = Array(totalBalls).fill(ASSETS.yellowStar);

  const [entities, setEntities] = useState<EntityMap>({});

  const gateRef = useRef<Matter.Body | null>(null);
  const worldRef = useRef<Matter.World | null>(null);
  const ballsRef = useRef<Matter.Body[]>([]);
  const isGateOpenRef = useRef(false);
  const ballPassedRef = useRef(false);

  const handleRelease = (deltaThisTurn: number) => {
    if (Math.abs(deltaThisTurn) > 60) {
      if (gateRef.current && !isGateOpenRef.current) {
        Matter.Body.translate(gateRef.current, { x: -60, y: 0 });
        isGateOpenRef.current = true;
        console.log("gate is opened");
      }
    }
  };
  const closeGate = () => {
    if (gateRef.current && isGateOpenRef.current) {
      console.log("close gate");
      Matter.Body.translate(gateRef.current, { x: 60, y: 0 });
      isGateOpenRef.current = false;
      ballPassedRef.current = false;
      setModalVisible(true);
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

      const x = 90 + col * gapX;
      const y = 200 + row * gapY;

      const ball = Matter.Bodies.circle(x, y, ballRadius, {
        restitution: 0.4,
        friction: 0.05,
        frictionStatic: 0.2,
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
        texture: starImages[idx % starImages.length],
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

    const shakingSubscription = Accelerometer.addListener((accelerometerData) => {
      const { x, y } = accelerometerData;

      ballsRef.current.forEach((ball) => {
        if (ball && worldRef.current) {
          const ballExists = worldRef.current.bodies.includes(ball);
          if (ball.isSleeping) {
            Matter.Sleeping.set(ball, false);
          }
          if (ballExists) {
            const gravityStrength = 1.5;
            engine.gravity.x = x * gravityStrength;
            engine.gravity.y = -y * gravityStrength;
          }
        }
      });
    });

    return () => {
      shakingSubscription.remove();
      Matter.Events.off(engine, "collisionStart");
      Matter.World.clear(world, false);
      Matter.Engine.clear(engine);
    };
  }, []);

  return { entities, handleRelease };
};
