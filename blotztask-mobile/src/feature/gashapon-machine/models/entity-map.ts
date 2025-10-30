import { GameEntity } from "./game-entity";
import { PhysicsEntity } from "./physics-entity";

export type EntityMap = {
  [key: string]: GameEntity | PhysicsEntity;
};
