import { apiClient } from "@/shared/services/api/client";
import { NoteTimeEstimationResult } from "../models/note-time-estimation-result";
import { NoteDTO } from "../models/note-dto";
//TODO : We no longer use floating task, please rename
export const estimateNoteTime = async (
  floatingTask: NoteDTO,
): Promise<NoteTimeEstimationResult> => {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/TimeEstimate`;
  return await apiClient.post(url, floatingTask);
};
