import Matter from "matter-js";
import { useEffect, useRef, useState } from "react";
import { createRectangleBetweenPoints } from "../utils/create-rectangle-between-points";
import { EntityMap } from "../models/entity-map";
import { WallRenderer } from "../components/wall-renderer";
import { ASSETS } from "@/shared/constants/assets";
import { CapsuleToyRenderer } from "../components/capsule-toy-renderer";
import { gashaponInnerWallPoints } from "../utils/gashapon-inner-wall-points";
import { InnerWallPolyline } from "../components/PolygonRenderer";

export const useGashaponMachineConfig = ({
  ballRadius = 22,
  totalBalls = 10,
}: {
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
    const calculateCenter = (points: Array<{ x: number; y: number }>) => {
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      return {
        cx: (Math.min(...xs) + Math.max(...xs)) / 2,
        cy: (Math.min(...ys) + Math.max(...ys)) / 2,
      };
    };

    const { cx, cy } = calculateCenter(gashaponInnerWallPoints);

    const scale = 1.2;
    const offsetX = 200; // 整个容器的屏幕位置
    const offsetY = 300;

    // 把原始点转成「缩放 + 平移」后的世界坐标
    const transformedPoints = gashaponInnerWallPoints.map((p) => ({
      x: (p.x - cx) * scale + offsetX,
      y: (p.y - cy) * scale + offsetY,
    }));

    const wallBodies: Matter.Body[] = [];

    for (let i = 0; i < transformedPoints.length - 1; i++) {
      const p1 = transformedPoints[i];
      const p2 = transformedPoints[i + 1];

      const segment = createRectangleBetweenPoints({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        thickness: 8,
      });

      wallBodies.push(segment);
    }

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

    Matter.World.add(world, [...wallBodies, gate]);

    const minGap = ballRadius * 2;
    const gapX = minGap * 1.2;
    const gapY = minGap * 1.2;

    let colCount = Math.floor(216 / gapX);
    if (colCount < 1) colCount = 1;
    if (colCount > totalBalls) colCount = totalBalls;

    const balls: Matter.Body[] = [];

    for (let i = 0; i < totalBalls; i++) {
      const col = i % colCount;
      const row = Math.floor(i / colCount);

      let x = 91 + col * gapX;
      let y = 262 + row * gapY;

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
