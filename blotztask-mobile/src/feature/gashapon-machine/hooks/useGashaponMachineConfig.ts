import Matter from "matter-js";
import { useEffect, useState } from "react";
import { createRectangleBetweenPoints } from "../utils/create-rectangle-between-points";
import { EntityMap } from "../models/entity-map";
import { ASSETS } from "@/shared/constants/assets";
import { CapsuleToyRenderer } from "../components/capsule-toy-renderer";
import { gashaponInnerWallPoints } from "../utils/gashapon-inner-wall-points";

import { isGameEntity } from "../utils/entity-map";

export const useGashaponMachineConfig = ({
  ballRadius = 22,
  totalBalls = 10,
}: {
  ballRadius?: number;
  totalBalls?: number;
} = {}) => {
  const eggImages = Array(totalBalls).fill(ASSETS.capsuleToy);

  const [entities, setEntities] = useState<EntityMap>({});
  const [worldRef, setWorldRef] = useState<Matter.World | null>(null);

  const handleRelease = (deltaThisTurn: number) => {
    if (Math.abs(deltaThisTurn) > 60) {
      const ballKeys = Object.keys(entities).filter((key) => key.startsWith("egg-"));
      if (ballKeys.length === 0) return;
      const randomKey = ballKeys[Math.floor(Math.random() * ballKeys.length)];
      const randomEntity = entities[randomKey];

      if (isGameEntity(randomEntity) && worldRef) {
        console.log(`🎯 Removing ball: ${randomKey}`);

        Matter.World.remove(worldRef, randomEntity.body);

        setEntities((prev) => {
          const newEntities = { ...prev };
          delete newEntities[randomKey];
          return newEntities;
        });
      }
    }
  };

  useEffect(() => {
    const engine = Matter.Engine.create({ enableSleeping: false });
    const world = engine.world;
    engine.gravity.y = 0.6;
    setWorldRef(world);

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
    const offsetX = 200;
    const offsetY = 300;

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

    Matter.World.add(world, [...wallBodies]);

    const gate = createRectangleBetweenPoints({
      x1: 0,
      y1: 500,
      x2: 80,
      y2: 500,
    });

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
      Matter.World.clear(world, false);
      Matter.Engine.clear(engine);
    };
  }, []);

  return { entities, handleRelease };
};
