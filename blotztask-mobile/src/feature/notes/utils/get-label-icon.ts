import { ASSETS } from "@/shared/constants/assets";

const STAR_ICONS = [
  ASSETS.purpleStar,
  ASSETS.greenStar,
  ASSETS.yellowStar,
  ASSETS.blueStar,
  ASSETS.rainbowStar,
];

export const getLabelIcon = () => {
  const randomIndex = Math.floor(Math.random() * STAR_ICONS.length);
  return STAR_ICONS[randomIndex];
};

export const getLabelNameFromStarLabel = (starLabel: string): string => {
  const match = /^star-\d+-label-(.+)$/.exec(starLabel);
  return match ? match[1] : "";
};
