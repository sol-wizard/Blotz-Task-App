import { fetchWithAuth } from "./fetch-with-auth";

export const generateAiTask = async (prompt: string) => {
  const payload = {
    prompt,
    timeZoneId: "Australia/Sydney",
  };

  const result = await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_URL_WITH_API}/azureai/generate`,
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

  const tasks = data.response.tasks.map((task: any, index: number) => ({
    id: index,
    description: task.description,
    title: task.title,
    dueDate: new Date(task.due_date),
  }));

  return {
    message: data.response.message,
    tasks,
  };
};
