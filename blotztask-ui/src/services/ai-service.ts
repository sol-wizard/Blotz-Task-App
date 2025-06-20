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
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL_WITH_API}/AzureAi/generate`;

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
  const tasks = result.response.tasks.map((task) => {
    const newTask = {
      id: 0,
      description: task.description,
      title: task.title,
      isDone: false,
      label: task.label,
      dueDate: new Date(task.due_date),
      hasTime: false,
    };
    console.log(task.due_date);
    console.log('Generated task:', newTask); // 每个 task 打印一次

    return newTask;
  });

  return {
    message: result.response.message,
    tasks,
  };
}