import { BadgePreviewDTO } from "../models/badge-preview-dto";

export const PREVIEW_SLOT_COUNT = 3;

export const getPreviewBadges = (badges: BadgePreviewDTO[]): BadgePreviewDTO[] =>
  badges
    .filter(
      (badge): badge is BadgePreviewDTO & { equippedSlot: number } => badge.equippedSlot !== null,
    )
    .sort((a, b) => a.equippedSlot - b.equippedSlot)
    .slice(0, PREVIEW_SLOT_COUNT);
