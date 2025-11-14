import Matter from "matter-js";
import { useEffect, useRef, useState } from "react";
import { createRectangleBetweenPoints } from "../utils/create-rectangle-between-points";
import { EntityMap } from "../models/entity-map";
import { WallRenderer } from "../components/wall-renderer";
import { FloorRenderer } from "../components/floor-render";
import { ASSETS } from "@/shared/constants/assets";
import { CapsuleToyRenderer } from "../components/capsule-toy-renderer";

export const useGashaponMachineConfig = ({
  starRadius = 15,
  totalStars = 10,
  onStarDropped,
}: {
  starRadius?: number;
  totalStars?: number;
  onStarDropped: () => void;
}) => {
  const starImages = Array(totalStars).fill(ASSETS.yellowStar);

  const [entities, setEntities] = useState<EntityMap>({});

  const gateRef = useRef<Matter.Body | null>(null);
  const worldRef = useRef<Matter.World | null>(null);
  const starsRef = useRef<Matter.Body[]>([]);
  const isGateOpenRef = useRef(false);
  const starPassedRef = useRef(false);

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
      starPassedRef.current = false;
      onStarDropped();
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

    const stars: Matter.Body[] = [];

    const gapX = starRadius * 2 + 5;
    const gapY = starRadius * 2 + 5;

    for (let i = 0; i < totalStars; i++) {
      const col = i % 5;
      const row = Math.floor(i / 5);

      const x = startX + col * gapX;
      const y = startY + row * gapY;

      const star = Matter.Bodies.circle(x, y, starRadius, {
        restitution: 0.4,
        friction: 0.05,
        frictionStatic: 0.5,
        frictionAir: 0.01,
        label: `star-${i}`,
      });

      stars.push(star);
    }
    Matter.World.add(world, stars);
    starsRef.current = stars;

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

    stars.forEach((star, idx) => {
      newEntities["star-" + idx] = {
        body: star,
        texture: starImages[idx % starImages.length],
        renderer: CapsuleToyRenderer,
      };
    });

    setEntities(newEntities);
    Matter.Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        const star = bodyA.label.startsWith("star")
          ? bodyA
          : bodyB.label.startsWith("star")
            ? bodyB
            : null;
        const sensor = bodyA.label === "dropSensor" || bodyB.label === "dropSensor";

        if (star && sensor) {
          console.log(`⚡ Star ${star.label} passed sensor, removing`);
          starPassedRef.current = true;
          closeGate();
        }
      });
    });

    Accelerometer.setUpdateInterval(16);

    const shakingSubscription = Accelerometer.addListener((accelerometerData) => {
      const { x, y } = accelerometerData;

      starsRef.current.forEach((star) => {
        if (star && worldRef.current) {
          const starExists = worldRef.current.bodies.includes(star);
          if (star.isSleeping) {
            Matter.Sleeping.set(star, false);
          }
          if (starExists) {
            const gravityStrength = 1.5;
            engine.gravity.x = x * gravityStrength;
            engine.gravity.y = -y * gravityStrength;
          }
        }
      });
    });

    return () => {
      Matter.Events.off(engine, "collisionStart");
    };
  }, []);

  return { entities, gateRef, isGateOpenRef, handleRelease };
};
