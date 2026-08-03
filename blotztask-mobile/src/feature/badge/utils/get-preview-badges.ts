import { BadgePreviewDTO } from "../models/badge-preview-dto";

const PREVIEW_DISPLAY_ORDERS = [0, 1, 2];

export const getPreviewBadges = (badges: BadgePreviewDTO[]): BadgePreviewDTO[] =>
  badges
    .filter((badge) => PREVIEW_DISPLAY_ORDERS.includes(badge.displayOrder))
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, PREVIEW_DISPLAY_ORDERS.length);
