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
  getPendingDrop,
  clearPendingDrop,
}: {
  starRadius?: number;
  onStarDropped: (payload: { labelName: string; taskId?: number }) => void;
  floatingTasks: FloatingTaskDTO[];
  getPendingDrop?: () => { taskId: number; labelName: string } | null;
  clearPendingDrop?: () => void;
}) => {
  const [entities, setEntities] = useState<EntityMap>({});

  type MachineState = "idle" | "revealed" | "returning";

  const gateRef = useRef<Matter.Body | null>(null);
  const worldRef = useRef<Matter.World | null>(null);
  const starsRef = useRef<Matter.Body[]>([]);
  const isGateOpenRef = useRef(false);
  const starPassedRef = useRef(false);
  const droppedStarIndexRef = useRef<number>(-1); // save the original index of the dropped star
  const droppedStarLabelRef = useRef<string>(""); // save the label of the dropped star for return animation
  const droppedTaskIdRef = useRef<number>(-1); // save the ID of the dropped task
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

    console.log(`Resetting star index: ${droppedStarIndexRef.current}`);

    // Directly mutate entities instead of creating new object
    // GameEngine holds reference to entities, so mutation updates it
    setEntities((prevEntities) => {
      // 如果有保存的索引，用索引直接获取
      if (droppedStarIndexRef.current >= 0) {
        const idx = droppedStarIndexRef.current;
        let star = starsRef.current[idx];
        const labelName = getLabelNameByDroppedStarIndex();
        const entityKey = getStarEntityKey(idx);

        // Pile zone (engine coordinates)
        const pileLeft = 70;
        const pileRight = 330;
        const pileTop = 320;
        const pileBottom = 460;
        const targetX = pileLeft + Math.random() * (pileRight - pileLeft);
        const targetY = pileTop + Math.random() * (pileBottom - pileTop);

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

        console.log(`Resetting star ${star.label} at original index ${idx}, position (${x}, ${y})`);

        // Re-add to world
        if (!world.bodies.includes(star)) {
          console.log(`Re-adding ${star.label} to world`);
          Matter.World.add(world, star);
        }

        // Reset physics properties - drop from top and try to land in a random area within the pile
        Matter.Body.setPosition(star, { x, y });

        // Approximate time to fall to targetY: t ~= sqrt(2*dy/g)
        // Use initial vx to drift towards targetX during the fall.
        const dy = Math.max(80, targetY - y);
        const g = Math.max(0.1, (world as any)?.gravity?.y ?? 0.6);
        const t = Math.sqrt((2 * dy) / g);
        const vxRaw = (targetX - x) / Math.max(0.1, t);
        const vx = Math.max(-6, Math.min(6, vxRaw));

        Matter.Body.setVelocity(star, { x: vx, y: 0 });
        Matter.Body.setAngularVelocity(star, 0);
        Matter.Sleeping.set(star, false);

        // Re-create entity (if deleted) - directly modify prevEntities
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
      droppedStarLabelRef.current = "";
      droppedTaskIdRef.current = -1;
      closeGate();
      console.log("Reset complete, gate closed");

      isResettingRef.current = false;

      transition("idle", "resetComplete");
    }, 100);
  };

  const beginReturnFlow = () => {
    // Called from UI when user taps Cancel.
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
    starLabelsRef.current = floatingTasks.map((task, idx) => {
      // Handle both camelCase (label.name) and PascalCase (Label.Name) from API
      const label = (task as any)?.label ?? (task as any)?.Label;
      const labelName = label?.name ?? label?.Name ?? "no-label";
      return labelName;
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
          // Only treat this as a "drop" when the user has opened the gate.
          // Prevents occasional sensor hits from background physics jitter.
          if (!isGateOpenRef.current || machineStateRef.current !== "idle") {
            return;
          }
          console.log(`⚡ Star ${star.label} passed sensor, removing`);
          const starIndex = starsRef.current.indexOf(star);
          if (starIndex < 0) {
            console.warn(`Star ${star.label} not found in starsRef; ignoring sensor event.`);
            return;
          }
          const pending = getPendingDrop?.() ?? null;
          const fallbackLabelName = getLabelNameByIndex(starIndex);
          const fallbackTaskId = floatingTasksRef.current[starIndex]?.id;
          const labelName = pending?.labelName ?? fallbackLabelName;
          const taskId = pending?.taskId ?? fallbackTaskId;

          // Save the index of the star for later reset
          droppedStarIndexRef.current = starIndex;
          // Save the label for return animation (even if task list changes)
          droppedStarLabelRef.current = labelName;
          // Save the task ID
          droppedTaskIdRef.current = taskId ?? -1;

          console.log(
            `Dropped star index ${starIndex} label ${labelName} taskId ${taskId ?? "n/a"}`,
          );

          starPassedRef.current = true;
          closeGate();
          onStarDropped({ labelName, taskId });
          clearPendingDrop?.();

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
