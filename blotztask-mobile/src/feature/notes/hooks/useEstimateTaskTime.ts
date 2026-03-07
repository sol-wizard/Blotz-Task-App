import { useQueryClient } from "@tanstack/react-query";
import { estimateNoteTime } from "../services/note-time-estimate-service";
import { useState } from "react";
import { estimateKeys } from "@/shared/constants/query-key-factory";
import { NoteTimeEstimationResult } from "../models/note-time-estimation-result";
import { NoteDTO } from "../models/note-dto";

export const useEstimateTaskTime = () => {
  const queryClient = useQueryClient();

  const [isEstimating, setIsEstimating] = useState(false);
  const [estimationResult, setEstimationResult] = useState<NoteTimeEstimationResult | undefined>(
    undefined,
  );
  const [estimationError, setEstimationError] = useState<string | null>(null);

  const estimateTime = async (note: NoteDTO) => {
    setIsEstimating(true);
    setEstimationError(null);
    setEstimationResult(undefined);

    try {
      const data = await queryClient.fetchQuery<NoteTimeEstimationResult>({
        queryKey: estimateKeys.noteTime(note),
        queryFn: () => estimateNoteTime(note),
        meta: { silent: true },
      });
      console.log("Time estimation result:", data);
      if (data.isSuccess === true) {
        setEstimationResult(data);
        return;
      } else {
        setEstimationError(data.errorMessage ?? "unknown error");
      }

      return data;
    } catch (err) {
      setEstimationError(err instanceof Error ? err.message : "unknown error");
      throw err;
    } finally {
      setIsEstimating(false);
    }
  };

  return {
    estimateTime,
    isEstimating,
    estimationResult,
    estimationError,
  };
};
