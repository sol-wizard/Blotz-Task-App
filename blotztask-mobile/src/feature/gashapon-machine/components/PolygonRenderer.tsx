import Svg, { Polyline, Polygon } from "react-native-svg";

type XY = { x: number; y: number };

const toSvgPoints = (pts: XY[]) => pts.map((p) => `${p.x},${p.y}`).join(" ");

export function InnerWallPolyline({
  body,
  width = 340,
  height = 500,
  close = false,
}: {
  body: Matter.Body;
  width?: number;
  height?: number;
  close?: boolean;
}) {
  const pointsStr = toSvgPoints(body.vertices);

  return (
    <Svg width={width} height={height} pointerEvents="none" viewBox="0 0 400 600">
      {close ? (
        <Polygon
          points={pointsStr}
          stroke="#333"
          strokeWidth={6}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : (
        <Polyline
          points={pointsStr}
          stroke="#333"
          strokeWidth={6}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </Svg>
  );
}
