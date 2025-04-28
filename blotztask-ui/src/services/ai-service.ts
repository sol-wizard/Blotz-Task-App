import { ExtractedTasksWrapperDTO } from '@/model/extracted-tasks-wrapper-dto';
import { fetchWithAuth } from '@/utils/fetch-with-auth';

interface PromptRequest {
  prompt: string;
}

export async function generateAiTask(prompt: string): Promise<ExtractedTasksWrapperDTO> {
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL_WITH_API}/AzureAi/generate`;

  const result = await fetchWithAuth<{ response: ExtractedTasksWrapperDTO }>(url, {
    method: 'POST',
    body: JSON.stringify({ prompt } satisfies PromptRequest),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return result.response;
}

export async function generateAiTaskFromGoal(payload: {
  goal: string;
  durationInDays: number;
}): Promise<ExtractedTasksWrapperDTO> {
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL_WITH_API}/AzureAi/generate-tasks-from-goal`;

  const result = await fetchWithAuth<{ response: ExtractedTasksWrapperDTO }>(url, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return result.response;
}
