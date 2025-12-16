import { Dimensions } from "react-native";

export const GAME_ENGINE_SIZE = {
  width: 400,
  height: 500,
} as const;

// GameEngine in `gashapon-machine.tsx` is positioned with style `{ bottom: 100 }`.
export const GAME_ENGINE_STYLE_BOTTOM = 100;

// Single source of truth: machine entry point in GameEngine coordinate system.
export const MACHINE_ENTRY_POINT_ENGINE = {
  x: 140,
  y: 250,
} as const;

export type Point = { x: number; y: number };

export const engineToScreenAbsolute = (point: Point): Point => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  const x = (screenWidth - GAME_ENGINE_SIZE.width) / 2 + point.x;
  const y =
    screenHeight - GAME_ENGINE_STYLE_BOTTOM - GAME_ENGINE_SIZE.height + point.y;

  return { x, y };
};

// For overlays that start at screen center (translate from center-origin).
export const screenAbsoluteToCenterRelative = (point: Point): Point => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  return {
    x: point.x - screenWidth / 2,
    y: point.y - screenHeight / 2,
  };
};

export const engineToScreenCenterRelative = (point: Point): Point =>
  screenAbsoluteToCenterRelative(engineToScreenAbsolute(point));
