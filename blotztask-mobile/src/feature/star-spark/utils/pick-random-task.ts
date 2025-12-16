import { FloatingTaskDTO } from "../models/floating-task-dto";

// Pick a random task from the list (ignore label, just return any task)
export const pickRandomTask = (tasks: FloatingTaskDTO[], _labelName?: string) => {
  if (!tasks || tasks.length === 0) {
    console.log("No tasks available");
    return null;
  }

  const randomIndex = Math.floor(Math.random() * tasks.length);
  return tasks[randomIndex];
};
