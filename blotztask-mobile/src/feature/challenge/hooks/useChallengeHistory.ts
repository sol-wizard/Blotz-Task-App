import { useQuery } from "@tanstack/react-query";
import { fetchChallengeHistory } from "../services/challenge-service";
import { challengeKeys } from "./useCurrentChallenge";

export const useChallengeHistory = () => {
  const { data, isLoading } = useQuery({
    queryKey: challengeKeys.history,
    queryFn: () => fetchChallengeHistory(),
    refetchOnMount: "always",
  });

  return { history: data ?? [], isLoading };
};
