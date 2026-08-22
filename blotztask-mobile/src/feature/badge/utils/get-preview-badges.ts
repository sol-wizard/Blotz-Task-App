import { BadgePreviewDTO } from "../models/badge-preview-dto";

const PREVIEW_SLOTS = 3;

type EquippedBadge = BadgePreviewDTO & { equippedSlot: number };

export const getPreviewBadges = (badges: BadgePreviewDTO[]): BadgePreviewDTO[] =>
  badges
    .filter((badge): badge is EquippedBadge => badge.equippedSlot !== null)
    .sort((a, b) => a.equippedSlot - b.equippedSlot)
    .slice(0, PREVIEW_SLOTS);
