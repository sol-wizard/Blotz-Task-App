import { fetchWithAuth } from "@/services/fetch-with-auth";

export const generateAiTask = async (prompt: string) => {
  const payload = {
    prompt,
    timeZoneId: "Australia/Sydney", //TODO: Get from device settings
  };

  const result = await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_URL_WITH_API}/aitask/generate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!result.ok) {
    const errorText = await result.text();
    throw new Error(`Server error: ${errorText}`);
  }

  const data = await result.json();

  interface TaskDetailDTO {
    id: number;
    description: string;
    title: string;
    endTime: Date;
  }

  const tasks = data.response.tasks.map(
    (task: TaskDetailDTO, index: number) => ({
      id: index,
      description: task.description,
      title: task.title,
      endTime: new Date(task.endTime),
    })
  );

  return {
    message: data.response.message,
    tasks,
  };
};
