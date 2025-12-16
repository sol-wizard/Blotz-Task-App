import Matter from "matter-js";
import { useEffect, useRef, useState } from "react";
import { createRectangleBetweenPoints } from "../utils/create-rectangle-between-points";
import { EntityMap } from "../models/entity-map";
import { CapsuleToyRenderer } from "../components/capsule-toy-renderer";
import { WallRenderer } from "../components/wall-renderer";
import { wallPoints } from "../utils/gashapon-inner-wall-points";
import { Accelerometer } from "expo-sensors";
import { FloatingTaskDTO } from "@/feature/star-spark/models/floating-task-dto";
import { getLabelIcon } from "@/feature/star-spark/utils/get-label-icon";

export const useGashaponMachineConfig = ({
  starRadius = 15,
  onStarDropped,
  floatingTasks,
  debugWalls = false,
}: {
  starRadius?: number;
  onStarDropped: (v: string) => void;
  floatingTasks: FloatingTaskDTO[];
  debugWalls?: boolean;
}) => {
  const [entities, setEntities] = useState<EntityMap>({});

  type MachineState = "idle" | "revealed" | "returning";

  const gateRef = useRef<Matter.Body | null>(null);
  const worldRef = useRef<Matter.World | null>(null);
  const starsRef = useRef<Matter.Body[]>([]);
  const isGateOpenRef = useRef(false);
  const starPassedRef = useRef(false);
  const droppedStarIndexRef = useRef<number>(-1); // 保存星星的原始索引
  const floatingTasksRef = useRef<FloatingTaskDTO[]>([]);
  const starLabelsRef = useRef<string[]>([]);

  const isResettingRef = useRef(false);
  const machineStateRef = useRef<MachineState>("idle");

  const transition = (next: MachineState, reason: string) => {
    const prev = machineStateRef.current;
    if (prev !== next) {
      console.log(`[machine] ${prev} -> ${next} (${reason})`);
      machineStateRef.current = next;
    }
  };

  const getLabelNameByIndex = (idx: number) => {
    if (starLabelsRef.current[idx]) return starLabelsRef.current[idx];
    const task = floatingTasksRef.current[idx];
    // Handle both camelCase (label.name) and PascalCase (Label.Name) from API
    const label = (task as any)?.label ?? (task as any)?.Label;
    return label?.name ?? label?.Name ?? "no-label";
  };
  const getStarEntityKey = (idx: number) => `star-${idx}`;

  const handleRelease = (deltaThisTurn: number) => {
    if (Math.abs(deltaThisTurn) > 60) {
      if (gateRef.current && !isGateOpenRef.current) {
        // Only allow spinning/opening the gate when we're not in the middle of returning.
        if (machineStateRef.current === "returning") {
          return;
        }
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
      starPassedRef.current = false;
    }
  };

  const resetStarsPhysics = () => {
    if (!worldRef.current) return;

    // Prevent re-entrancy and avoid resetting during/just after a new drop/spin.
    if (isResettingRef.current) {
      console.warn("resetStarsPhysics already running; skipping.");
      return;
    }

    // Only allow reset as part of the explicit return flow.
    if (machineStateRef.current !== "returning") {
      console.warn(
        `resetStarsPhysics called while state=${machineStateRef.current}; skipping reset to prevent state bleed.`,
      );
      return;
    }

    if (droppedStarIndexRef.current < 0) {
      console.warn("No dropped star index recorded; skipping reset.");
      return;
    }

    isResettingRef.current = true;

    const world = worldRef.current;
    const starRadius = 15;
    const gapX = starRadius * 2 + 5;
    const gapY = starRadius * 2 + 5;

    console.log(`Resetting star index: ${droppedStarIndexRef.current}`);

    // Directly mutate entities instead of creating new object
    // GameEngine holds reference to entities, so mutation updates it
    setEntities((prevEntities) => {
      // 如果有保存的索引，用索引直接获取
      if (droppedStarIndexRef.current >= 0) {
        const idx = droppedStarIndexRef.current;
        let star = starsRef.current[idx];
        const labelName = getLabelNameByIndex(idx);
        const entityKey = getStarEntityKey(idx);

        // Reset position to machine top entry point so star falls naturally into pile
        const x = 140; // Center of machine opening
        const y = 250; // Top of machine interior

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

        console.log(`Resetting star ${star.label} at original index ${idx}, position (${x}, ${y})`);

        // 重新添加到世界
        if (!world.bodies.includes(star)) {
          console.log(`Re-adding ${star.label} to world`);
          Matter.World.add(world, star);
        }

        // 重置物理属性 - 让星星自然掉落到星星堆
        Matter.Body.setPosition(star, { x, y });
        Matter.Body.setVelocity(star, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(star, 0);
        Matter.Sleeping.set(star, false);

        // 重新创建实体（如果被删除了）- 直接修改 prevEntities
        prevEntities[entityKey] = {
          body: star,
          texture: getLabelIcon(labelName),
          renderer: CapsuleToyRenderer,
        };
        console.log(`Re-created entity for ${entityKey} with label ${labelName}`);
        console.log(`Star body position after reset: (${star.position.x}, ${star.position.y})`);
        console.log(`Star body in world: ${world.bodies.includes(star)}`);
      }

      return prevEntities; // Return same reference for GameEngine
    });

    // Clear index AFTER setEntities completes
    setTimeout(() => {
      starPassedRef.current = false;
      droppedStarIndexRef.current = -1;
      closeGate();
      console.log("Reset complete, gate closed");

      isResettingRef.current = false;

      transition("idle", "resetComplete");
    }, 100);
  };

  const beginReturnFlow = () => {
    // Called from UI when user taps Try again.
    if (machineStateRef.current !== "revealed") {
      console.warn(`beginReturnFlow ignored; state=${machineStateRef.current}`);
      return;
    }
    transition("returning", "tryAgain");
  };

  useEffect(() => {
    if (!floatingTasks || floatingTasks.length === 0) {
      return;
    }

    floatingTasksRef.current = floatingTasks;
    starLabelsRef.current = floatingTasks.map((task) => {
      // Handle both camelCase (label.name) and PascalCase (Label.Name) from API
      const label = (task as any)?.label ?? (task as any)?.Label;
      return label?.name ?? label?.Name ?? "no-label";
    });

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

    if (debugWalls) {
      wallBodies.forEach((wall) => {
        newEntities[wall.label] = {
          body: wall,
          renderer: WallRenderer,
        };
      });
    }

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
          console.log(`⚡ Star ${star.label} passed sensor, removing`);
          const starIndex = starsRef.current.indexOf(star);
          if (starIndex < 0) {
            console.warn(`Star ${star.label} not found in starsRef; ignoring sensor event.`);
            return;
          }
          const labelName = getLabelNameByIndex(starIndex);

          // 保存星星的索引，用于后续重置
          droppedStarIndexRef.current = starIndex;

          console.log(`Dropped star index ${starIndex} label ${labelName}`);

          starPassedRef.current = true;
          closeGate();
          onStarDropped(labelName);

          transition("revealed", "sensorDrop");

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

  return { entities, handleRelease, resetStarsPhysics, beginReturnFlow };
};
