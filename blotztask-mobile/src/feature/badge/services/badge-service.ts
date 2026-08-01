import { apiClient } from "@/shared/services/api/client";
import { BadgePreviewDTO } from "../models/badge-preview-dto";
import { BadgeDetailDTO } from "../models/badge-detail-dto";
import { EquippedBadgeDTO } from "../models/equipped-badge-dto";

export const fetchAllBadges = async (): Promise<BadgePreviewDTO[]> => {
  return await apiClient.get<BadgePreviewDTO[]>("/Badge");
};

export const fetchBadgeDetailById = async (badgeId: number): Promise<BadgeDetailDTO> => {
  return await apiClient.get<BadgeDetailDTO>(`/Badge/${badgeId}`);
};

// Both return the resulting equipped badges, ordered by slot.
export const equipBadge = async (badgeId: number): Promise<EquippedBadgeDTO[]> => {
  return await apiClient.post<EquippedBadgeDTO[]>(`/Badge/${badgeId}/equip`);
};

export const unequipBadge = async (badgeId: number): Promise<EquippedBadgeDTO[]> => {
  return await apiClient.delete<EquippedBadgeDTO[]>(`/Badge/${badgeId}/equip`);
};
