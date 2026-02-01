import { ASSETS } from "@/shared/constants/assets";
import { ImageSourcePropType } from "react-native";

const STAR_ICONS = [
  ASSETS.purpleStar,
  ASSETS.greenStar,
  ASSETS.yellowStar,
  ASSETS.blueStar,
  ASSETS.rainbowStar,
];

const hashStringToNumber = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return hash;
};

export const getStarIconAsBefore = (seed: number | string): ImageSourcePropType => {
  const numericSeed = typeof seed === "string" ? hashStringToNumber(seed) : seed;
  const normalizedSeed = Math.abs(numericSeed) % STAR_ICONS.length;
  return STAR_ICONS[normalizedSeed];
};
