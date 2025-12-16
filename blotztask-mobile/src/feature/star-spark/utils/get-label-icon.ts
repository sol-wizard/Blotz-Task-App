import { ASSETS } from "@/shared/constants/assets";

import { FloatingTaskDTO } from "@/feature/star-spark/models/floating-task-dto";

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

export const getTaskLabelIconByTaskId = (
  tasks: FloatingTaskDTO[] | undefined,
  taskId: number | undefined,
) => {
  if (!tasks || taskId == null) return ASSETS.rainbowStar;
  const task = tasks.find((t) => t.id === taskId);
  return getLabelIcon(task?.label?.name);
};

export const getLabelNameFromStarLabel = (starLabel: string): string => {
  const match = /^star-\d+-label-(.+)$/.exec(starLabel);
  return match ? match[1] : "";
};

export const debugTaskLabelIcon = (
  tasks: FloatingTaskDTO[] | undefined,
  taskId: number | undefined
) => {
  if (!tasks) {
    console.debug("No tasks provided.");
    return ASSETS.rainbowStar;
  }
  if (taskId == null) {
    console.debug("No task ID provided.");
    return ASSETS.rainbowStar;
  }

  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    console.debug(`Task with ID ${taskId} not found.`);
    return ASSETS.rainbowStar;
  }

  if (!task.label || !task.label.name) {
    console.debug(`Task with ID ${taskId} has no label.`);
    return ASSETS.rainbowStar;
  }

  console.debug(`Task with ID ${taskId} has label: ${task.label.name}`);
  return getLabelIcon(task.label.name);
};
