import React from "react";
import Avatar2 from "../../../../assets/avatars/avatar2.svg";
import Avatar9 from "../../../../assets/avatars/avatar9.svg";

export const WHATS_NEW_VERSION = "2026-12";

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
    imageZh: require("../../../../assets/images-png/whatsnew/whatsnew-ai-coach-zh.png"),
    imageEn: require("../../../../assets/images-png/whatsnew/whatsnew-ai-coach-en.png"),
    titleKey: "ai-coach.title",
    bodyKey: "ai-coach.body",
  },
  {
    type: "avatar",
    Avatar: Avatar9,
    titleKey: "ai-memory.title",
    bodyKey: "ai-memory.body",
  },
  {
    type: "screenshot",
    imageZh: require("../../../../assets/images-png/whatsnew/whatsnew-add-review-zh.png"),
    imageEn: require("../../../../assets/images-png/whatsnew/whatsnew-add-review-en.png"),
    titleKey: "add-review.title",
    bodyKey: "add-review.body",
  },
  {
    type: "screenshot",
    imageZh: require("../../../../assets/images-png/whatsnew/whatsnew-feedback-zh.png"),
    imageEn: require("../../../../assets/images-png/whatsnew/whatsnew-feedback-en.png"),
    titleKey: "feedback.title",
    bodyKey: "feedback.body",
  },
  {
    type: "screenshot",
    imageZh: require("../../../../assets/images-png/whatsnew/whatsnew-widget-zh.png"),
    imageEn: require("../../../../assets/images-png/whatsnew/whatsnew-widget-en.png"),
    titleKey: "widget.title",
    bodyKey: "widget.body",
  },
];
