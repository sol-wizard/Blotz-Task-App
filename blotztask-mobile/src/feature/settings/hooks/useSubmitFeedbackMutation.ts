import { useMutation } from "@tanstack/react-query";
import { submitFeedback } from "../services/feedback-service";
import { FeedbackImage } from "../modals/feedback-image";

export function useSubmitFeedbackMutation() {
  const mutation = useMutation({
    mutationKey: ["submitFeedback"],
    mutationFn: ({
      text,
      image,
      errorEventId,
    }: {
      text: string;
      image: FeedbackImage | null;
      errorEventId: string | null;
    }) => submitFeedback(text, image, errorEventId),
    meta: {
      errorMap: {
        429: "errors.feedbackRateLimited",
      },
    },
  });

  return {
    submitFeedback: mutation.mutateAsync,
    isSubmitting: mutation.isPending,
  };
}
