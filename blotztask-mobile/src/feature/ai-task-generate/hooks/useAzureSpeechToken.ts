import { useQuery } from "@tanstack/react-query";
import { fetchAzureSpeechToken } from "../services/azure-speech-token-service";
import { azureSpeechKeys } from "@/shared/constants/query-key-factory";

export const useAzureSpeechToken = () => {
  const { data: token, isLoading: isFetchingAzureToken } = useQuery({
    queryKey: azureSpeechKeys.azureSpeech(),
    queryFn: () => fetchAzureSpeechToken(),
    staleTime: 9 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });

  return {
    token,
    isFetchingAzureToken,
  };
};
