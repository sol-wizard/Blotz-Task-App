import { apiClient } from "@/shared/services/api/client";
import { CurrentChallengeDTO } from "../models/challenge-dto";

// The API answers 204 with an empty body when the user isn't in a challenge.
export const fetchCurrentChallenge = async (): Promise<CurrentChallengeDTO | null> => {
  const data = await apiClient.get<CurrentChallengeDTO | "">("/challenges/current");
  return data || null;
};

export const createChallenge = async (name: string): Promise<string> => {
  return await apiClient.post<string>("/challenges", { name });
};

export const joinChallenge = async (challengeId: string): Promise<void> => {
  return await apiClient.post(`/challenges/${challengeId}/join`);
};
