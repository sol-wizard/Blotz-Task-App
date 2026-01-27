import { ASSETS } from "@/shared/constants/assets";

const STAR_ICONS = [
  ASSETS.purpleStar,
  ASSETS.greenStar,
  ASSETS.yellowStar,
  ASSETS.blueStar,
  ASSETS.rainbowStar,
];

export const getStarIconAsBefore = (seed: number) => {
  const normalizedSeed = Math.abs(seed) % STAR_ICONS.length;
  return STAR_ICONS[normalizedSeed];
};

export const getLabelNameFromStarLabel = (starLabel: string): string => {
  const match = /^star-\d+-label-(.+)$/.exec(starLabel);
  return match ? match[1] : "";
};
