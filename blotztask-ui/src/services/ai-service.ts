import { AIAssistantResponse } from '@/model/ai-assistant-response';
import { ExtractedTask } from '@/model/extracted-task-dto';
import { fetchWithAuth } from '@/utils/fetch-with-auth';

// Raw backend response
interface AIGeneratedTasksResponse {
  message: string;
  tasks: ExtractedTask[];
}

interface PromptRequest {
  prompt: string;
  timeZoneId: string;
}

function getUserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export async function generateAiTask(prompt: string): Promise<AIAssistantResponse> {
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL_WITH_API}/aitask/generate`;

  const payload: PromptRequest = {
    prompt,
    timeZoneId: getUserTimeZone(),
  };

  const result = await fetchWithAuth<{ response: AIGeneratedTasksResponse }>(url, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  //Map the result from backend AI to TaskDetailDTO so can fit into frontend component
  const tasks = result.response.tasks.map((task, index) => ({
    id: index,
    description: task.description,
    title: task.title,
    isDone: false,
    label: task.label,
    dueDate: new Date(task.due_date),
    hasTime: false, //TODO: Current AI generate task still not support time
  }));

  return {
    message: result.response.message,
    tasks,
  };
}