import { UserProfileDTO } from "@/shared/models/user-profile-dto";
import { UserPreferencesDTO } from "@/shared/models/user-preferences-dto";
import { apiClient } from "./api/client";
import { UpdateUserProfileDTO } from "@/feature/settings/modals/update-user-profile-dto";
import { PushTokenDTO } from "@/shared/models/push-token-dto";

export const fetchUserProfile = async (): Promise<UserProfileDTO> => {
  const url = `/User`;
  return await apiClient.get<UserProfileDTO>(url);
};

export const updateUserProfile = async (userProfile: UpdateUserProfileDTO): Promise<string> => {
  const url = `/User`;
  return await apiClient.put<string>(url, userProfile);
};

export const fetchUserPreferences = async (): Promise<UserPreferencesDTO> => {
  const url = `/user-preferences`;

  return await apiClient.get(url);
};

export const updateUserPreferences = async (preferences: UserPreferencesDTO): Promise<string> => {
  const url = `/user-preferences`;
  return await apiClient.put(url, preferences);
};

export const upsertPushToken = async ({ token, deviceId }: PushTokenDTO): Promise<void> => {
  const url = `/user-push-tokens`;
  await apiClient.post<void>(url, { token, deviceId });
};

export const deleteUser = async (): Promise<void> => {
  const url = `/User`;
  await apiClient.delete<void>(url);
};
