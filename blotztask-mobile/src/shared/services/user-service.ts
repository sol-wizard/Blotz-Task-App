import { UserProfileDTO } from "@/shared/models/user-profile-dto";
import { UserPreferencesDTO } from "@/shared/models/user-preferences-dto";
import { apiClient } from "./api/client";
import { UpdateUserProfileDTO } from "@/feature/settings/modals/update-user-profile-dto";

export const fetchUserProfile = async (): Promise<UserProfileDTO> => {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/User`;
  try {
    return await apiClient.get(url);
  } catch (err: any) {
    console.error("Fetch user profile failed:", err);
    throw new Error("Failed to load user profile data");
  }
};

export const updateUserProfile = async (userProfile: UpdateUserProfileDTO): Promise<string> => {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/User`;
  try {
    return await apiClient.put(url, userProfile);
  } catch (err: any) {
    console.error("Update user profile failed:", err);
    throw new Error("Failed to update user profile data");
  }
};

export const fetchUserPreferences = async (): Promise<UserPreferencesDTO> => {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/user-preferences`;
  try {
    return await apiClient.get(url);
  } catch (err: any) {
    console.error("Fetch user preferences failed:", err);
    throw new Error("Failed to load user preferences");
  }
};

export const updateUserPreferences = async (preferences: UserPreferencesDTO): Promise<string> => {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/user-preferences`;
  try {
    return await apiClient.put(url, preferences);
  } catch (err: any) {
    console.error("Update user preferences failed:", err);
    throw new Error("Failed to update user preferences");
  }
};
