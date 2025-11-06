export const gashaponInnerWallPoints = [
  {
    x: 272.5,
    y: 124.5,
  },
  {
    x: 272.39,
    y: 142.19,
  },
  {
    x: 271.65,
    y: 159.85,
  },
  {
    x: 269.47,
    y: 177.39,
  },
  {
    x: 264.8,
    y: 194.42,
  },
  {
    x: 256.55,
    y: 209.99,
  },
  {
    x: 244.49,
    y: 222.82,
  },
  {
    x: 229.64,
    y: 232.31,
  },
  {
    x: 213.3,
    y: 239.03,
  },
  {
    x: 196.17,
    y: 243.39,
  },
  {
    x: 178.72,
    y: 246.22,
  },
  {
    x: 161.12,
    y: 247.92,
  },
  {
    x: 143.46,
    y: 248.63,
  },

  {
    x: 108.1,
    y: 248.63,
  },
  {
    x: 90.49,
    y: 246.71,
  },
  {
    x: 73.05,
    y: 243.87,
  },
  {
    x: 55.94,
    y: 239.41,
  },
  {
    x: 39.76,
    y: 232.36,
  },
  {
    x: 25.32,
    y: 222.25,
  },
  {
    x: 14,
    y: 208.77,
  },
  {
    x: 6.56,
    y: 192.79,
  },
  {
    x: 2.5,
    y: 175.61,
  },
  {
    x: 0.67,
    y: 158.02,
  },
  {
    x: 0.08,
    y: 140.35,
  },
  {
    x: 0.08,
    y: 122.67,
  },
  {
    x: 1.62,
    y: 105.06,
  },
  {
    x: 5.84,
    y: 87.91,
  },
  {
    x: 12.51,
    y: 71.55,
  },
  {
    x: 21.47,
    y: 56.33,
  },
  {
    x: 32.48,
    y: 42.51,
  },
  {
    x: 45.31,
    y: 30.36,
  },
  {
    x: 59.71,
    y: 20.12,
  },
  {
    x: 75.33,
    y: 11.87,
  },
  {
    x: 91.89,
    y: 5.71,
  },
  {
    x: 109.12,
    y: 1.75,
  },
  {
    x: 126.72,
    y: 0.16,
  },
  {
    x: 144.38,
    y: 0.7,
  },
  {
    x: 161.85,
    y: 3.38,
  },
  {
    x: 178.86,
    y: 8.17,
  },
  {
    x: 195.25,
    y: 14.79,
  },
  {
    x: 210.76,
    y: 23.25,
  },
  {
    x: 225.16,
    y: 33.5,
  },
  {
    x: 238.26,
    y: 45.36,
  },
  {
    x: 249.79,
    y: 58.76,
  },
  {
    x: 259.24,
    y: 73.69,
  },
  {
    x: 266.38,
    y: 89.84,
  },
  {
    x: 270.88,
    y: 106.91,
  },
];

// 工具函数：变换坐标点
export const transformPoints = (
  points: Array<{ x: number; y: number }>,
  options: {
    offsetX?: number; // 右移距离
    offsetY?: number; // 下移距离
    scale?: number; // 缩放倍数
    centerX?: number; // 缩放中心点X（不提供则自动计算）
    centerY?: number; // 缩放中心点Y（不提供则自动计算）
  },
) => {
  const { offsetX = 0, offsetY = 0, scale = 1 } = options;

  // 计算中心点（用于缩放）
  let { centerX, centerY } = options;

  if (centerX === undefined || centerY === undefined) {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
  }

  return points.map((p) => ({
    x: (p.x - centerX) * scale + centerX + offsetX,
    y: (p.y - centerY) * scale + centerY + offsetY,
  }));
};

// 使用示例
export const gashaponInnerWallPointsTransformed = transformPoints(gashaponInnerWallPoints, {
  offsetX: 50, // 右移50像素
  offsetY: 100, // 下移100像素
  scale: 1.2, // 放大1.2倍
});
