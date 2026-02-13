import React from "react";
import { View } from "react-native";

export const WallRenderer = (props: any) => {
  const { body, color = "grey" } = props;
  const { bounds, angle } = body;

  const width = bounds.max.x - bounds.min.x;
  const height = bounds.max.y - bounds.min.y;
  const x = bounds.min.x;
  const y = bounds.min.y;

  return (
    <View
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        backgroundColor: color,
        transform: [{ rotate: `${angle}rad` }],
      }}
    />
  );
};
