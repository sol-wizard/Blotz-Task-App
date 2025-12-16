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

export const cleanupSystem = (entities: EntityMap) => {
  const physics = entities.physics as PhysicsEntity | undefined;
  if (!physics) return entities;

  const thresholdY = 449;
  const world = physics.world;

  Object.entries(entities).forEach(([key, entity]) => {
    if (isGameEntity(entity) && entity.body.label.startsWith("star")) {
      const y = entity.body.position.y;

      if (y > thresholdY) {
        const stillInWorld = world.bodies.includes(entity.body);
        if (!stillInWorld) {
          console.log(`🧹 Removing dropped star entity (body already removed): ${key}`);
          delete entities[key];
        }
      }
    }
  });

  return entities;
};
