import { UserProfileDTO } from "@/shared/models/user-profile-dto";
import { UserPreferencesDTO } from "@/shared/models/user-preferences-dto";
import { apiClient } from "./api/client";
import { UpdateUserProfileDTO } from "@/feature/settings/modals/update-user-profile-dto";

export const fetchUserProfile = async (): Promise<UserProfileDTO> => {
  const url = `/User`;
  return await apiClient.get<UserProfileDTO>(url);
};

export const updateUserProfile = async (userProfile: UpdateUserProfileDTO): Promise<string> => {
  const url = `/User`;
  try {
    return await apiClient.put<string>(url, userProfile);
  } catch (err: unknown) {
    console.error("Update user profile failed:", err);
    throw new Error("Failed to update user profile data");
  }
};

export const fetchUserPreferences = async (): Promise<UserPreferencesDTO> => {
  const url = `/user-preferences`;

  return await apiClient.get(url);
};

export const updateUserPreferences = async (preferences: UserPreferencesDTO): Promise<string> => {
  const url = `/user-preferences`;
  try {
    return await apiClient.put(url, preferences);
  } catch (err: unknown) {
    console.error("Update user preferences failed:", err);
    throw new Error("Failed to update user preferences");
  }
};

export const deleteUser = async (): Promise<void> => {
  const url = `/User`;
  try {
    await apiClient.delete<void>(url);
  } catch (err: unknown) {
    console.error("Delete user failed:", err);
    throw new Error("Failed to delete user");
  }
};
