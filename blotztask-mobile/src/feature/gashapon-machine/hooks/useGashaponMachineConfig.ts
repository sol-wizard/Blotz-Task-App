import Matter from "matter-js";
import { useEffect, useRef, useState } from "react";
import { createRectangleBetweenPoints } from "../utils/create-rectangle-between-points";
import { EntityMap } from "../models/entity-map";
import { CapsuleToyRenderer } from "../components/capsule-toy-renderer";
import { wallPoints } from "../utils/gashapon-inner-wall-points";
import { Accelerometer } from "expo-sensors";
import { FloatingTaskDTO } from "@/feature/star-spark/models/floating-task-dto";
import { getLabelIcon } from "@/feature/star-spark/utils/get-label-icon";

export const useGashaponMachineConfig = ({
  starRadius = 15,
  onStarDropped,
  floatingTasks,
}: {
  starRadius?: number;
  onStarDropped: (labelName: string) => void;
  floatingTasks: FloatingTaskDTO[];
  getPendingDrop?: () => { taskId: number; labelName: string } | null;
  clearPendingDrop?: () => void;
}) => {
  const [entities, setEntities] = useState<EntityMap>({});
  const gateRef = useRef<Matter.Body | null>(null);
  const worldRef = useRef<Matter.World | null>(null);
  const starsRef = useRef<Matter.Body[]>([]);
  const isGateOpenRef = useRef(false);
  const droppedStarIndexRef = useRef<number>(-1); // save the original index of the dropped star
  const droppedStarLabelRef = useRef<string>(""); // save the label of the dropped star for return animation
  const floatingTasksRef = useRef<FloatingTaskDTO[]>([]);

  const getLabelNameByIndex = (idx: number) => {
    const task = floatingTasksRef.current[idx];
    // Handle both camelCase (label.name) and PascalCase (Label.Name) from API
    const label = (task as any)?.label ?? (task as any)?.Label;
    const labelName = label?.name ?? label?.Name ?? "no-label";
    return labelName;
  };

  const getLabelNameByDroppedStarIndex = () => {
    // Use the saved label instead of looking it up, since floatingTasksRef may have changed
    if (!droppedStarLabelRef.current) {
      return "no-label";
    }
    return droppedStarLabelRef.current;
  };
  const getStarEntityKey = (idx: number) => `star-${idx}`;

  const handleRelease = (deltaThisTurn: number) => {
    if (Math.abs(deltaThisTurn) > 60) {
      if (gateRef.current && !isGateOpenRef.current) {
        // Only allow spinning/opening the gate when we're not in the middle of returning.
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
    }
  };

  const resetStarsPhysics = () => {
    if (!worldRef.current) return;

    if (droppedStarIndexRef.current < 0) {
      console.warn("No dropped star index recorded; skipping reset.");
      return;
    }

    const world = worldRef.current;
    const starRadius = 15;

    // Directly mutate entities instead of creating new object
    // GameEngine holds reference to entities, so mutation updates it

    if (droppedStarIndexRef.current >= 0) {
      const idx = droppedStarIndexRef.current;
      const labelToRestore = getLabelNameByDroppedStarIndex();
      let star = starsRef.current[idx];
      const entityKey = getStarEntityKey(idx);
      const x = 140;
      const y = 250;

      if (!star) {
        console.warn(`Star body missing for index ${idx}, recreating.`);
        star = Matter.Bodies.circle(x, y, starRadius, {
          restitution: 0.4,
          friction: 0.05,
          frictionStatic: 0.2,
          frictionAir: 0.01,
          label: entityKey,
        });
        starsRef.current[idx] = star;
      }
      // Re-add to world if needed
      if (!world.bodies.includes(star)) {
        Matter.World.add(world, star);
      }

      // Reset physics properties - drop from top and land inside the machine
      Matter.Body.setPosition(star, { x, y });
      Matter.Body.setVelocity(star, { x: 0, y: 0 });

      setEntities((prevEntities) => {
        prevEntities[entityKey] = {
          body: star,
          texture: getLabelIcon(labelToRestore),
          renderer: CapsuleToyRenderer,
        };
        return prevEntities;
      });
    }
    droppedStarIndexRef.current = -1;
    droppedStarLabelRef.current = "";
  };

  useEffect(() => {
    if (!floatingTasks || floatingTasks.length === 0) {
      return;
    }

    floatingTasksRef.current = floatingTasks;

    const engine = Matter.Engine.create({ enableSleeping: false });
    const world = engine.world;
    worldRef.current = world;

    engine.gravity.y = 0.6;

    const wallBodies: Matter.Body[] = [];

    for (let i = 0; i < wallPoints.length - 1; i++) {
      const p1 = wallPoints[i];
      const p2 = wallPoints[i + 1];
      if (i >= 14 && i <= 16) {
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
      y2: 485,
      thickness: 20,
      options: {
        label: "dropSensor",
        isStatic: true,
        isSensor: true,
      },
    });

    Matter.World.add(world, sensor);

    const stars: Matter.Body[] = [];

    const gapX = starRadius * 2 + 5;
    const gapY = starRadius * 2 + 5;

    for (let i = 0; i < floatingTasks.length; i++) {
      const col = i % 6;
      const row = Math.floor(i / 6);

      const x = 90 + col * gapX;
      const y = 230 + row * gapY;
      const star = Matter.Bodies.circle(x, y, starRadius, {
        restitution: 0.4,
        friction: 0.05,
        frictionStatic: 0.2,
        frictionAir: 0.01,
        label: getStarEntityKey(i),
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
    };

    stars.forEach((star, idx) => {
      const labelName = getLabelNameByIndex(idx);
      const entityKey = getStarEntityKey(idx);

      newEntities[entityKey] = {
        body: star,
        texture: getLabelIcon(labelName),
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
          const starIndex = starsRef.current.indexOf(star);
          const labelName = getLabelNameByIndex(starIndex);

          // Save the index of the star for later reset
          droppedStarIndexRef.current = starIndex;
          // Save the label for return animation (even if task list changes)
          droppedStarLabelRef.current = labelName;

          closeGate();
          onStarDropped(labelName);
          // Remove the star from physics world
          if (worldRef.current && starsRef.current.includes(star)) {
            Matter.World.remove(worldRef.current, star);
          }
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
      shakingSubscription.remove();
      Matter.Events.off(engine, "collisionStart");
      Matter.World.clear(world, false);
      Matter.Engine.clear(engine);
    };
  }, [floatingTasks]);

  return { entities, handleRelease, resetStarsPhysics };
};
