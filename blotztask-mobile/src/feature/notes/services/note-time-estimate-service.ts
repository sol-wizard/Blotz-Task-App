import { apiClient } from "@/shared/services/api/client";
import { NoteTimeEstimation } from "../models/note-time-estimation";
import { NoteDTO } from "../models/note-dto";

export const estimateNoteTime = async (floatingTask: NoteDTO): Promise<NoteTimeEstimation> => {
  try {
    const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/TimeEstimate`;
    const taskTimeEstimation: NoteTimeEstimation = await apiClient.post(url, floatingTask);
    return taskTimeEstimation;
  } catch (error) {
    console.error("Error estimating task time:", error);
    throw new Error("Failed to estimate task time.");
  }
};
