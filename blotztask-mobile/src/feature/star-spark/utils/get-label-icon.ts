import { ASSETS } from "@/shared/constants/assets";
import { FloatingTaskDTO } from "../models/floatingTaskDto";
import { ImageSourcePropType } from "react-native";

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

export const createStarImagesFromTasks = (tasks: FloatingTaskDTO[]): ImageSourcePropType[] => {
  return tasks.slice(0, 30).map((task) => getLabelIcon(task.label?.name));
};
