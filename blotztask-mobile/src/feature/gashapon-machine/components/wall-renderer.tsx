import React from "react";
import { View } from "react-native";

// Debug renderer: shows a rectangle for a wall segment body.
// Use it by assigning `renderer: WallRenderer` to wall entities.
export const WallRenderer = (props: any) => {
  const { body } = props;
  const { position, angle } = body;

  // Matter rectangle stores dimensions in body.bounds.
  const width = Math.max(1, body.bounds.max.x - body.bounds.min.x);
  const height = Math.max(1, body.bounds.max.y - body.bounds.min.y);

  const x = position.x - width / 2;
  const y = position.y - height / 2;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        borderWidth: 1,
        borderColor: "rgba(255,0,0,0.55)",
        backgroundColor: "rgba(255,0,0,0.10)",
        zIndex: 999,
        transform: [{ rotate: `${angle}rad` }],
      }}
    />
  );
};
