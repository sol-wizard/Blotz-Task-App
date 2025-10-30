import Matter from "matter-js";

type RectPoints = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export function createRectangleBetweenPoints(
  { x1, y1, x2, y2 }: RectPoints,
  height: number = 10,
  options: Matter.IChamferableBodyDefinition = {},
) {
  const centerX = (x1 + x2) / 2;
  const centerY = (y1 + y2) / 2;
  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const angle = Math.atan2(y2 - y1, x2 - x1);

  const body = Matter.Bodies.rectangle(centerX, centerY, length, height, {
    isStatic: true,
    friction: 1,
    frictionStatic: 1,
    restitution: 0,
    angle,
    ...options,
  });

  return body;
}
