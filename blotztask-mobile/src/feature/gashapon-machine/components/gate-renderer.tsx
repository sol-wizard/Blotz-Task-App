import { View } from "react-native";

export const GateRenderer = (props: any) => {
  const { body, color = "red" } = props;
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
