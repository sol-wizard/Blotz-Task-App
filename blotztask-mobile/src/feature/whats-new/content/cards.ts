import React from "react";
import Avatar2 from "../../../../assets/avatars/avatar2.svg";
import Avatar4 from "../../../../assets/avatars/avatar4.svg";

export const WHATS_NEW_VERSION = "2026-09";

type ScreenshotCard = {
  type: "screenshot";
  imageZh: number;
  imageEn: number;
  titleKey: string;
  bodyKey: string;
};

type AvatarCard = {
  type: "avatar";
  Avatar: React.ComponentType<{ width?: number; height?: number }>;
  titleKey: string;
  bodyKey: string;
};

type IntroCard = {
  type: "intro";
  Avatar: React.ComponentType<{ width?: number; height?: number }>;
  titleKey: string;
  bodyKey: string;
};

export type WhatsNewCard = ScreenshotCard | AvatarCard | IntroCard;

export const WHATS_NEW_CARDS: WhatsNewCard[] = [
  {
    type: "intro",
    Avatar: Avatar2,
    titleKey: "intro.title",
    bodyKey: "intro.body",
  },
  {
    type: "screenshot",
    imageZh: require("../../../../assets/images-png/whatsnew/whatsnew-review-letter-zh.png"),
    imageEn: require("../../../../assets/images-png/whatsnew/whatsnew-review-letter-en.png"),
    titleKey: "review-letter.title",
    bodyKey: "review-letter.body",
  },
  {
    type: "screenshot",
    imageZh: require("../../../../assets/images-png/whatsnew/whatsnew-badge-preview-zh.png"),
    imageEn: require("../../../../assets/images-png/whatsnew/whatsnew-badge-preview-en.png"),
    titleKey: "badge-preview.title",
    bodyKey: "badge-preview.body",
  },
  {
    type: "screenshot",
    imageZh: require("../../../../assets/images-png/whatsnew/whatsnew-invite-friends-zh.png"),
    imageEn: require("../../../../assets/images-png/whatsnew/whatsnew-invite-friends-en.png"),
    titleKey: "invite-friends.title",
    bodyKey: "invite-friends.body",
  },
  {
    type: "avatar",
    Avatar: Avatar4,
    titleKey: "toast-icons.title",
    bodyKey: "toast-icons.body",
  },
];
