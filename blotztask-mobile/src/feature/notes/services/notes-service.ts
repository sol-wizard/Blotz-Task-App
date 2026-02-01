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

export const deleteNote = async (noteId: string): Promise<void> => {
  const url = `/notes/${noteId}`;
  try {
    await apiClient.delete(url);
  } catch {
    throw new Error("Failed to delete note.");
  }
};
