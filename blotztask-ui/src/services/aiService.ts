import { ExtractedTask } from '@/model/extracted-task-dto';
import { fetchWithAuth } from '@/utils/fetch-with-auth';

interface PromptRequest {
  prompt: string;
}

export async function generateAiTask(prompt: string): Promise<ExtractedTask> {
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL_WITH_API}/AzureAi/generate`;

  const result = await fetchWithAuth<{ response: ExtractedTask }>(url, {
    method: 'POST',
    body: JSON.stringify({ prompt } satisfies PromptRequest),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return result.response;
}
