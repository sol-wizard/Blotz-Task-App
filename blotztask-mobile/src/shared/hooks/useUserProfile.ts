import { useQuery } from "@tanstack/react-query";
import { fetchUserProfile } from "../services/user-service";
import { userKeys } from "../constants/query-key-factory";

export const useUserProfile = (enabled: boolean = true) => {
  const {
    data: userProfile,
    isLoading: isUserProfileLoading,
    isFetching: isUserProfileFetching,
  } = useQuery({
    queryKey: userKeys.profile(),
    queryFn: () => fetchUserProfile(),
    enabled,
  });

  return {
    userProfile,
    isUserProfileLoading,
    isUserProfileFetching,
  };
};
