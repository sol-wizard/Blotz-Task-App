import { ASSETS } from "@/shared/constants/assets";

export const getLabelIcon = (labelName?: string) => {
  switch (labelName) {
    case "Work":
      return ASSETS.purpleStar;
    case "Learning":
      return ASSETS.greenStar;
    case "Life":
      return ASSETS.yellowStar;
    case "Health":
      return ASSETS.blueStar;
    default:
      return ASSETS.rainbowStar;
  }
};

export const getLabelNameFromStarLabel = (starLabel: string): string => {
  const match = /^star-\d+-label-(.+)$/.exec(starLabel);
  return match ? match[1] : "";
};
