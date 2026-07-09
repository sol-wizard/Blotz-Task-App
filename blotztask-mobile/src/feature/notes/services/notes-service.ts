import { apiClient } from "@/shared/services/api/client";
import { NoteDTO } from "../models/note-dto";
import { EditNoteDTO } from "../models/edit-note-dto";
import { CreateNoteDTO } from "../models/create-note-dto";

export const searchNotes = async (keyword: string): Promise<NoteDTO[]> => {
  const url = `/notes`;
  return await apiClient.get(url, {
    params: keyword ? { query: keyword } : undefined,
  });
};

export const deleteNote = async (noteId: string): Promise<void> => {
  const url = `/notes/${noteId}`;

  return await apiClient.delete(url);
};

export const createNote = async (createNoteDto: CreateNoteDTO): Promise<NoteDTO> => {
  const url = `/notes`;

  return await apiClient.post(url, {
    text: createNoteDto.text,
    isPersistent: createNoteDto.isPersistent,
  });
};

export const updateNote = async (editNoteDto: EditNoteDTO): Promise<NoteDTO> => {
  const url = `/notes/${editNoteDto.id}`;

  return await apiClient.put(url, {
    text: editNoteDto.text,
    isPersistent: editNoteDto.isPersistent,
  });
};

export const convertNoteToTask = async (
  noteId: string,
  startTime: string,
  endTime: string,
): Promise<{ taskId: number }> => {
  const url = `/notes/${noteId}/convert-to-task`;

  return await apiClient.post<{ taskId: number }>(url, { startTime, endTime });
};
