import i18n from "@/i18n";
import { BadgeDTO } from "../models/badge-preview-dto";

const BADGE_ICON_BASE =
  "https://stgblotztaskstag.blob.core.windows.net/badge/TaskCompletion/overdue";

// Mock badge with both languages.
interface MockBadge extends Omit<BadgeDTO, "title"> {
  titleEn: string;
  titleZh: string;
}

const MOCK_BADGES: MockBadge[] = [
  {
    id: 1,
    titleEn: "Basket-believable",
    titleZh: "篮以置信",
    iconUrl: `${BADGE_ICON_BASE}/basket-believable.png`,
    displayOrder: 0,
  },
  {
    id: 6,
    titleEn: "Lazy Cat",
    titleZh: "懒懒黑猫",
    iconUrl: `${BADGE_ICON_BASE}/lazy-cat.png`,
    displayOrder: 1,
  },
  {
    id: 7,
    titleEn: "Stellar Wanderer",
    titleZh: "星际漫游者",
    iconUrl: `${BADGE_ICON_BASE}/stellar-wanderer.png`,
    displayOrder: 2,
  },
  {
    id: 3,
    titleEn: "Slow is Fast",
    titleZh: "慢即是快",
    iconUrl: `${BADGE_ICON_BASE}/slow-is-fast.png`,
    displayOrder: 3,
  },
  {
    id: 5,
    titleEn: "Free Earth",
    titleZh: "自在地球",
    iconUrl: `${BADGE_ICON_BASE}/free-earth.png`,
    displayOrder: 4,
  },
  {
    id: 4,
    titleEn: "Slow Pound Time",
    titleZh: "慢捣时光",
    iconUrl: `${BADGE_ICON_BASE}/slow-pound-time.png`,
    displayOrder: 5,
  },
];

const localizeTitle = (badge: MockBadge): string =>
  i18n.language.startsWith("zh") ? badge.titleZh : badge.titleEn;

// TODO: Replace this mock with the real "Get All Badges" endpoint once it ships:
//   return await apiClient.get("/Badge");
export const fetchAllBadges = async (): Promise<BadgeDTO[]> => {
  return MOCK_BADGES.map(({ titleEn, titleZh, ...rest }) => ({
    ...rest,
    title: localizeTitle({ titleEn, titleZh, ...rest }),
  }));
};
