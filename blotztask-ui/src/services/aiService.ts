import { ExtractedTask } from "@/model/extracted-task-dto";

export async function generateAiTask(prompt: string): Promise<ExtractedTask> {
  // Simulate network delay
  await new Promise((res) => setTimeout(res, 1000));

  // Return mock task based on prompt
  return {
    title: `Generated Task from: "${prompt}"`,
    dueDate: '2025-04-10', // or null if you want to test that case
  };
}
