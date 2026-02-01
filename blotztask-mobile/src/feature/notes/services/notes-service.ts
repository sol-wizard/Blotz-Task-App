import { apiClient } from "@/shared/services/api/client";
import { NoteDTO } from "../models/note-dto";
import { EditNoteDTO } from "../models/edit-note-dto";

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

export const createNote = async (text: string): Promise<NoteDTO> => {
  const url = `/notes`;
  try {
    return await apiClient.post(url, { text });
  } catch {
    throw new Error("Failed to create note.");
  }
};

export const updateNote = async (editNoteDto: EditNoteDTO): Promise<NoteDTO> => {
  const url = `/notes/${editNoteDto.id}`;
  try {
    return await apiClient.put(url, { text: editNoteDto.text });
  } catch {
    throw new Error("Failed to update note.");
  }
};
