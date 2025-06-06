import { ExtractedTasksWrapperDTO } from '@/model/extracted-tasks-wrapper-dto';
import { fetchWithAuth } from '@/utils/fetch-with-auth';

interface PromptRequest {
  prompt: string;
  timeZoneId: string;
}

function getUserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export async function generateAiTask(prompt: string): Promise<ExtractedTasksWrapperDTO> {
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL_WITH_API}/AzureAi/generate`;

  const payload: PromptRequest = {
    prompt,
    timeZoneId: getUserTimeZone(),
  };

  const result = await fetchWithAuth<{ response: ExtractedTasksWrapperDTO }>(url, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return result.response;
}