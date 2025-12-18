import { FloatingTaskDTO } from "../models/floating-task-dto";

// Pick a random task from the list (ignore label, just return any task)
export const pickRandomTask = (tasks: FloatingTaskDTO[], labelName: string) => {
  let candidates;
  if (labelName == "no-label") {
    candidates = tasks.filter((t) => t.label === null);
  } else {
    candidates = tasks.filter((t) => t.label?.name === labelName);
  }

  if (candidates.length === 0) {
    console.log(`There is no task with ${labelName} in task list!`);
    return null;
  }

  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
};
