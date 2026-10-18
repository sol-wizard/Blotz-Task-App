import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createChallenge, joinChallenge } from "../services/challenge-service";
import { challengeKeys } from "./useCurrentChallenge";

export const useCreateChallenge = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (name: string) => createChallenge(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: challengeKeys.current }),
    meta: {
      errorMap: {
        409: "errors.challenge.alreadyInChallenge",
      },
    },
  });

  return { createChallenge: mutation.mutate, isCreating: mutation.isPending };
};

export const useJoinChallenge = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (challengeId: string) => joinChallenge(challengeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: challengeKeys.current }),
    meta: {
      errorMap: {
        // A code that isn't a valid id never reaches the action, so the route 404s too.
        404: "errors.challenge.notFound",
        409: "errors.challenge.cannotJoin",
      },
    },
  });

  return { joinChallenge: mutation.mutate, isJoining: mutation.isPending };
};
