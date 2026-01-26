import { useQueryClient } from "@tanstack/react-query";
import { estimateNoteTime } from "../services/note-time-estimate-service";
import { useState } from "react";
import { estimateKeys } from "@/shared/constants/query-key-factory";
import { NoteTimeEstimation } from "../models/note-time-estimation";
import { NoteDTO } from "../models/note-dto";

export const useEstimateTaskTime = () => {
  const queryClient = useQueryClient();

  const [isEstimating, setIsEstimating] = useState(false);
  const [timeResult, setTimeResult] = useState<string | undefined>(undefined);
  const [estimateError, setEstimateError] = useState<unknown>(null);

  const estimateTime = async (note: NoteDTO) => {
    setIsEstimating(true);
    setEstimateError(null);

    try {
      const data = await queryClient.fetchQuery<NoteTimeEstimation>({
        queryKey: estimateKeys.noteTime(note),
        queryFn: () => estimateNoteTime(note),
        meta: { silent: true },
      });

      setTimeResult(data?.duration);
      return data;
    } catch (err) {
      setEstimateError(err);
      throw err;
    } finally {
      setIsEstimating(false);
    }
  };

  return {
    estimateTime,
    isEstimating,
    timeResult,
    estimateError,
  };
};
