import { GameEntity } from "../models/game-entity";
import { PhysicsEntity } from "../models/physics-entity";

export function isGameEntity(entity: GameEntity | PhysicsEntity | undefined): entity is GameEntity {
  return !!entity && "body" in entity;
}
