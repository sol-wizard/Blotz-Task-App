import { useMutation } from "@tanstack/react-query";
import { submitFeedback } from "../services/feedback-service";
import { FeedbackImage } from "../modals/feedback-image";

export function useSubmitFeedbackMutation() {
  const mutation = useMutation({
    mutationKey: ["submitFeedback"],
    mutationFn: ({ text, image }: { text: string; image: FeedbackImage | null }) =>
      submitFeedback(text, image),
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
