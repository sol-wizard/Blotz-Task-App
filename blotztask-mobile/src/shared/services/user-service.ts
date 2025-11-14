import { UserProfileDTO } from "@/shared/models/user-profile-dto";
import { apiClient } from "./api/client";

export const fetchUserProfile = async (): Promise<UserProfileDTO> => {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/User`;
  try {
    return await apiClient.get(url);
  } catch (err: any) {
    console.error("Fetch user profile failed:", err);
    throw new Error("Failed to load user profile data");
  }
};
