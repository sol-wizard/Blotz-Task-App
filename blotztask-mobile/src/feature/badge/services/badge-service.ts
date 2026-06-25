import i18n from "@/i18n";
import { BadgeDTO } from "../models/badge-preview-dto";
import { BadgeDetailDTO } from "../models/badge-detail-dto";

const BADGE_ICON_BASE =
  "https://stgblotztaskstag.blob.core.windows.net/badge/TaskCompletion/overdue";

// Mock badge with both languages.
interface MockBadge {
  id: number;
  titleEn: string;
  titleZh: string;
  descriptionEn: string;
  descriptionZh: string;
  categoryEn: string;
  categoryZh: string;
  iconUrl: string;
  displayOrder: number;
  obtainedAt: Date;
}

const MOCK_BADGES: MockBadge[] = [
  {
    id: 1,
    titleEn: "Basket-believable",
    titleZh: "篮以置信",
    descriptionEn:
      "You actually nailed it right on schedule! Treat yourself to some exercise, and toss all your worries into the hoop.",
    descriptionZh: "居然真的卡点完成啦！奖励自己，去运动一会，把烦恼都投出去～",
    categoryEn: "Task Completion",
    categoryZh: "任务完成",
    iconUrl: `${BADGE_ICON_BASE}/basket-believable.png`,
    displayOrder: 0,
    obtainedAt: new Date("2026-03-01"),
  },
  {
    id: 6,
    titleEn: "Lazy Cat",
    titleZh: "懒懒黑猫",
    descriptionEn:
      "It's okay if the task isn't finished, the lazy long cat will slow down with you.",
    descriptionZh: "任务没做完没关系，懒懒长条猫陪你一起慢下来！",
    categoryEn: "Task Completion",
    categoryZh: "任务完成",
    iconUrl: `${BADGE_ICON_BASE}/lazy-cat.png`,
    displayOrder: 1,
    obtainedAt: new Date("2026-03-01"),
  },
  {
    id: 7,
    titleEn: "Stellar Wanderer",
    titleZh: "星际漫游者",
    descriptionEn:
      "Allow your thoughts to briefly wander among the stars, and after a short relaxation, you can still steadily return to place.",
    descriptionZh: "允许思绪短暂遨游于星际，放松片刻后，依旧能稳稳归位！",
    categoryEn: "Task Completion",
    categoryZh: "任务完成",
    iconUrl: `${BADGE_ICON_BASE}/stellar-wanderer.png`,
    displayOrder: 2,
    obtainedAt: new Date("2026-03-01"),
  },
  {
    id: 3,
    titleEn: "Slow is Fast",
    titleZh: "慢即是快",
    descriptionEn:
      "With the slowness of a tortoise, at the speed of the stars. Slow is fast, wander freely.",
    descriptionZh: "以龟之慢，行星之速，慢即是快，自在遨游！",
    categoryEn: "Task Completion",
    categoryZh: "任务完成",
    iconUrl: `${BADGE_ICON_BASE}/slow-is-fast.png`,
    displayOrder: 3,
    obtainedAt: new Date("2026-03-01"),
  },
  {
    id: 5,
    titleEn: "Free Earth",
    titleZh: "自在地球",
    descriptionEn:
      "Procrastination until amnesia, the earth still rotates. Take a sip of coffee and blow a gust of wind!",
    descriptionZh: "拖到失忆，地球照样转，喝一口咖啡，吹一阵风！",
    categoryEn: "Task Completion",
    categoryZh: "任务完成",
    iconUrl: `${BADGE_ICON_BASE}/free-earth.png`,
    displayOrder: 4,
    obtainedAt: new Date("2026-03-01"),
  },
  {
    id: 4,
    titleEn: "Slow Pound Time",
    titleZh: "慢捣时光",
    descriptionEn: "Two days of effort, one lively companion. Your airbag goldfish has arrived!",
    descriptionZh: "手握捣棒，心有暖阳，三餐四季慢慢尝",
    categoryEn: "Task Completion",
    categoryZh: "任务完成",
    iconUrl: `${BADGE_ICON_BASE}/slow-pound-time.png`,
    displayOrder: 5,
    obtainedAt: new Date("2026-03-01"),
  },
];

const localizeTitle = (badge: MockBadge): string =>
  i18n.language.startsWith("zh") ? badge.titleZh : badge.titleEn;

// TODO: Replace this mock with the real "Get All Badges" endpoint once it ships:
//   return await apiClient.get("/Badge");
export const fetchAllBadges = async (): Promise<BadgeDTO[]> => {
  return MOCK_BADGES.map((badge) => ({
    id: badge.id,
    title: localizeTitle(badge),
    iconUrl: badge.iconUrl,
    displayOrder: badge.displayOrder,
  }));
};

const localizeDescription = (badge: MockBadge): string =>
  i18n.language.startsWith("zh") ? badge.descriptionZh : badge.descriptionEn;

const localizeCategory = (badge: MockBadge): string =>
  i18n.language.startsWith("zh") ? badge.categoryZh : badge.categoryEn;

// will need to be replace by the backend as well.
export const fetchBadgeDetailById = async (
  badgeId: number,
): Promise<BadgeDetailDTO | undefined> => {
  const badge = MOCK_BADGES.find((item) => item.id === badgeId);

  if (!badge) return undefined;

  return {
    id: badge.id,
    name: localizeTitle(badge),
    description: localizeDescription(badge),
    category: localizeCategory(badge),
    iconUrl: badge.iconUrl,
    displayOrder: badge.displayOrder,
    obtainedAt: badge.obtainedAt,
  };
};
