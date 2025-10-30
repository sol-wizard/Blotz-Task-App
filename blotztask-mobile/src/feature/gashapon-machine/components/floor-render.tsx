import React from "react";
import { View } from "react-native";

export const FloorRenderer = (props: any) => {
  const { body, color = "black" } = props;
  const width = body.bounds.max.x - body.bounds.min.x;
  const height = body.bounds.max.y - body.bounds.min.y;
  const x = body.position.x - width / 2;
  const y = body.position.y - height / 2;
  const angle = body.angle;

  return (
    <View
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: width,
        height: 2, // 细线
        backgroundColor: color,
        transform: [
          { translateX: width / 2 },
          { translateY: height / 2 },
          { rotate: `${angle}rad` },
          { translateX: -width / 2 },
          { translateY: -height / 2 },
        ],
      }}
    />
  );
};
