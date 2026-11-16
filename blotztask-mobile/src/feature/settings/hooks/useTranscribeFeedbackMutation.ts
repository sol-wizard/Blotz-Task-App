import { useMutation } from "@tanstack/react-query";
import { transcribeFeedbackAudio } from "../services/feedback-transcribe-service";

export function useTranscribeFeedbackMutation() {
  const mutation = useMutation({
    mutationKey: ["transcribeFeedback"],
    mutationFn: (uri: string) => transcribeFeedbackAudio(uri),
    meta: {
      errorMap: {
        400: "errors.feedbackNoSpeech",
        429: "errors.feedbackTranscribeRateLimited",
      },
    },
  });

  return {
    transcribeFeedback: mutation.mutateAsync,
    isTranscribing: mutation.isPending,
  };
}
