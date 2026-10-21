import { apiClient } from "./api/client";

export const clearUserMemories = async (): Promise<void> => {
  const url = `/user-memories`;
  await apiClient.delete<void>(url);
};
