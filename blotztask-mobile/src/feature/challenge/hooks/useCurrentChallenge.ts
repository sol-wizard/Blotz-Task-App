import { useQuery } from "@tanstack/react-query";
import { fetchCurrentChallenge } from "../services/challenge-service";

export const challengeKeys = {
  current: ["challenge", "current"] as const,
};

// While the team is still filling up, poll so new members' avatars show up without a manual refresh.
const FILLING_POLL_MS = 5000;

export const useCurrentChallenge = () => {
  const { data, isLoading } = useQuery({
    queryKey: challengeKeys.current,
    queryFn: () => fetchCurrentChallenge(),
    refetchOnMount: "always",
    refetchInterval: (query) =>
      query.state.data?.status === "NotStarted" ? FILLING_POLL_MS : false,
  });

  return { challenge: data ?? null, isLoading };
};
