import Svg, { Polyline, Polygon } from "react-native-svg";
import { gashaponInnerWallPoints } from "../utils/gashapon-inner-wall-points";

type XY = { x: number; y: number };

// 工具：把点数组转成 "x1,y1 x2,y2 …" 字符串
const toSvgPoints = (pts: XY[]) => pts.map((p) => `${p.x},${p.y}`).join(" ");

export function InnerWallPolyline({
  width = 340,
  height = 500,
  close = false, // true=封闭区域(Polygon)，false=只描边(Polyline)
  stroke = "#333",
  strokeWidth = 6,
  fill = "none",
}: {
  width?: number;
  height?: number;
  close?: boolean;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
}) {
  const pointsStr = toSvgPoints(gashaponInnerWallPoints); // 这里 points 建议已经是“世界坐标”
  return (
    <Svg width={width} height={height} pointerEvents="none">
      {close ? (
        <Polygon
          points={pointsStr}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : (
        <Polyline
          points={pointsStr}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </Svg>
  );
}
