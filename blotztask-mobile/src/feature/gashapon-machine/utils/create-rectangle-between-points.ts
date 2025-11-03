// utils/create-rectangle-between-points.ts
import Matter from "matter-js";

type CreateRectangleBetweenPointsArgs = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness?: number; // 线条粗细
};

/**
 * 在两点之间创建一条细长的矩形刚体（类似一段线段）
 */
export const createRectangleBetweenPoints = ({
  x1,
  y1,
  x2,
  y2,
  thickness = 10,
}: CreateRectangleBetweenPointsArgs) => {
  const dx = x2 - x1;
  const dy = y2 - y1;

  // 两点之间的距离 = 矩形长度
  const length = Math.hypot(dx, dy);

  // 中点 = 矩形中心
  const centerX = (x1 + x2) / 2;
  const centerY = (y1 + y2) / 2;

  // 与 x 轴夹角
  const angle = Math.atan2(dy, dx);

  const body = Matter.Bodies.rectangle(centerX, centerY, length, thickness, {
    isStatic: true,
  });

  Matter.Body.setAngle(body, angle);

  return body;
};
