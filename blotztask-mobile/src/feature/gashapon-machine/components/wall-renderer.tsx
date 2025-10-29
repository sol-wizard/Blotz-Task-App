import { View } from "react-native";

export const WallRenderer = (props: any) => {
  const { body, color = "#000" } = props;
  const { min, max } = body.bounds;
  const width = max.x - min.x;
  const height = max.y - min.y;

  return (
    <View
      style={{
        position: "absolute",
        left: min.x,
        top: min.y,
        width,
        height,
        backgroundColor: color,
      }}
    />
  );
};
