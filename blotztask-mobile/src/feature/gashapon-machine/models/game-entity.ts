import { ImageSourcePropType } from "react-native";

export type GameEntityRendererProps = {
  body: Matter.Body;
  texture?: ImageSourcePropType;
  color?: string;
};

export type GameEntity = {
  body: Matter.Body;
  texture?: ImageSourcePropType;
  color?: string;
  renderer: React.ComponentType<GameEntityRendererProps>;
};
