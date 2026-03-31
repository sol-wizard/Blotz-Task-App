import { apiClient } from "@/shared/services/api/client";
import { NoteDTO } from "../models/note-dto";
import { EditNoteDTO } from "../models/edit-note-dto";

export const searchNotes = async (keyword: string): Promise<NoteDTO[]> => {
  const url = `/notes`;
  return await apiClient.get(url, {
    params: keyword ? { query: keyword } : undefined,
  });
};

export const deleteNote = async (noteId: string): Promise<void> => {
  const url = `/notes/${noteId}`;
  try {
    await apiClient.delete(url);
  } catch {
    throw new Error("Failed to delete note.");
  }
};

export const createNote = async (text: string): Promise<NoteDTO> => {
  const url = `/notes`;

  return await apiClient.post(url, { text });
};

export const updateNote = async (editNoteDto: EditNoteDTO): Promise<NoteDTO> => {
  const url = `/notes/${editNoteDto.id}`;

  return await apiClient.put(url, { text: editNoteDto.text });
};

export const convertNoteToTask = async (
  noteId: string,
  startTime: string,
  endTime: string,
): Promise<{ taskId: number }> => {
  const url = `/notes/${noteId}/convert-to-task`;
  try {
    return await apiClient.post<{ taskId: number }>(url, { startTime, endTime });
  } catch {
    throw new Error("Failed to convert note to task.");
  }
};
