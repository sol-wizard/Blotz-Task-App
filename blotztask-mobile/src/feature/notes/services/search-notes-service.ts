import { apiClient } from "@/shared/services/api/client";
import { NoteDTO } from "../models/note-dto";

export const searchNotes = async (keyword: string): Promise<NoteDTO[]> => {
  const trimmedKeyword = keyword.trim();
  console.log("Searching notes with keyword:", trimmedKeyword);
  const url = `/Notes`;
  try {
    return await apiClient.get(url, {
      params: trimmedKeyword ? { query: trimmedKeyword } : undefined,
    });
  } catch {
    throw new Error("Failed to search notes.");
  }
};
