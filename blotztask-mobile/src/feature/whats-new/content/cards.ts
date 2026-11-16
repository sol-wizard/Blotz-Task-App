import React from "react";
import Avatar7 from "../../../../assets/avatars/avatar7.svg";

export const WHATS_NEW_VERSION = "2026-11";

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
    Avatar: Avatar7,
    titleKey: "intro.title",
    bodyKey: "intro.body",
  },
  {
    type: "screenshot",
    imageZh: require("../../../../assets/images-png/whatsnew/whatsnew-widget-zh.png"),
    imageEn: require("../../../../assets/images-png/whatsnew/whatsnew-widget-en.png"),
    titleKey: "widget.title",
    bodyKey: "widget.body",
  },
  {
    type: "screenshot",
    imageZh: require("../../../../assets/images-png/whatsnew/whatsnew-invite-progress-zh.png"),
    imageEn: require("../../../../assets/images-png/whatsnew/whatsnew-invite-progress-en.png"),
    titleKey: "invite-progress.title",
    bodyKey: "invite-progress.body",
  },
  {
    type: "screenshot",
    imageZh: require("../../../../assets/images-png/whatsnew/whatsnew-badge-unlock-zh.png"),
    imageEn: require("../../../../assets/images-png/whatsnew/whatsnew-badge-unlock-en.png"),
    titleKey: "badge-unlock.title",
    bodyKey: "badge-unlock.body",
  },
];
