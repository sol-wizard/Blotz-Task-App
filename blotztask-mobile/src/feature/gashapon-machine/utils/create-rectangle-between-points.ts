import Matter from "matter-js";

type CreateRectangleBetweenPointsArgs = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness?: number;
  options?: Matter.IChamferableBodyDefinition;
};

export const createRectangleBetweenPoints = ({
  x1,
  y1,
  x2,
  y2,
  thickness = 10,
  options,
}: CreateRectangleBetweenPointsArgs) => {
  const dx = x2 - x1;
  const dy = y2 - y1;

  const length = Math.hypot(dx, dy);

  const centerX = (x1 + x2) / 2;
  const centerY = (y1 + y2) / 2;

  const angle = Math.atan2(dy, dx);

  const body = Matter.Bodies.rectangle(centerX, centerY, length, thickness, {
    isStatic: true,
    ...options,
  });

  Matter.Body.setAngle(body, angle);

  return body;
};
