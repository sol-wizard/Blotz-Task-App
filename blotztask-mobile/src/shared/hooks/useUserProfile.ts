import { useQuery } from "@tanstack/react-query";
import { fetchUserProfile } from "../services/user-service";

export const useUserProfile = () => {
  const { data: userProfile, isLoading: isUserProfileLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => fetchUserProfile(),
  });

  return {
    userProfile,
    isUserProfileLoading,
  };
};
