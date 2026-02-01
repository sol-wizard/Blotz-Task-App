import { apiClient } from "@/shared/services/api/client";
import { NoteDTO } from "../models/note-dto";

export const searchNotes = async (keyword: string): Promise<NoteDTO[]> => {
  const url = `/notes`;
  try {
    return await apiClient.get(url, {
      params: keyword ? { query: keyword } : undefined,
    });
  } catch {
    throw new Error("Failed to search notes.");
  }
};
