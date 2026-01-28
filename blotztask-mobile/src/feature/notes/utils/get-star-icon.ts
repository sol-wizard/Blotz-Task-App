import { ASSETS } from "@/shared/constants/assets";
import { ImageSourcePropType } from "react-native";

const STAR_ICONS = [
  ASSETS.purpleStar,
  ASSETS.greenStar,
  ASSETS.yellowStar,
  ASSETS.blueStar,
  ASSETS.rainbowStar,
];

export const getStarIconAsBefore = (seed: number): ImageSourcePropType => {
  const normalizedSeed = Math.abs(seed) % STAR_ICONS.length;
  return STAR_ICONS[normalizedSeed];
};
