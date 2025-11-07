import Matter from "matter-js";
import { EntityMap } from "../models/entity-map";
import { GameLoopArgs } from "../models/game-loop-args";
import { PhysicsEntity } from "../models/physics-entity";
import { isGameEntity } from "./entity-map";

export const physicsSystem = (entities: EntityMap, { time }: GameLoopArgs) => {
  const physics = entities.physics as PhysicsEntity | undefined;

  if (!physics) {
    console.log("Physics engine not initialized yet.");
    return entities;
  }
  const MAX_DELTA = 1000 / 60;
  const dt = Math.min(time.delta, MAX_DELTA);

  Matter.Engine.update(physics.engine, dt);
  return entities;
};

export const cleanupSystem = (entities: EntityMap, {}: any) => {
  const physics = entities.physics as PhysicsEntity | undefined;
  if (!physics) return entities;

  const world = physics.world;
  const thresholdY = 449;

  Object.entries(entities).forEach(([key, entity]) => {
    if (isGameEntity(entity) && entity.body.label.startsWith("ball")) {
      const y = entity.body.position.y;

      if (y > thresholdY) {
        console.log(`🧹 Removing dropped ball: ${key}`);

        delete entities[key];
      }
    }
  });

  return entities;
};
