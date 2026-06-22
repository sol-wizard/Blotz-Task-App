import { BadgeDTO } from "../models/badge-dto";

const PREVIEW_DISPLAY_ORDERS = [0, 1, 2];

export const getPreviewBadges = (badges: BadgeDTO[]): BadgeDTO[] =>
  badges
    .filter((badge) => PREVIEW_DISPLAY_ORDERS.includes(badge.displayOrder))
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, PREVIEW_DISPLAY_ORDERS.length);
