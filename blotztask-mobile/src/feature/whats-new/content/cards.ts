import React from "react";
import Avatar2 from "../../../../assets/avatars/avatar2.svg";
import Avatar3 from "../../../../assets/avatars/avatar3.svg";

export const WHATS_NEW_VERSION = "2026-07";

type ScreenshotCard = {
  type: "screenshot";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  image: any;
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
    image: require("../../../../assets/images-png/whatsnew/whatsnew-badge-detail.png"),
    titleKey: "badge-detail.title",
    bodyKey: "badge-detail.body",
  },
  {
    type: "screenshot",
    image: require("../../../../assets/images-png/whatsnew/whatsnew-persistent-note.png"),
    titleKey: "persistent-note.title",
    bodyKey: "persistent-note.body",
  },
  {
    type: "screenshot",
    image: require("../../../../assets/images-png/whatsnew/whatsnew-widget.png"),
    titleKey: "widget.title",
    bodyKey: "widget.body",
  },
  {
    type: "screenshot",
    image: require("../../../../assets/images-png/whatsnew/whatsnew-firework.png"),
    titleKey: "firework.title",
    bodyKey: "firework.body",
  },
  {
    type: "avatar",
    Avatar: Avatar2,
    titleKey: "time-picker.title",
    bodyKey: "time-picker.body",
  },
  {
    type: "avatar",
    Avatar: Avatar3,
    titleKey: "recurring-subtasks.title",
    bodyKey: "recurring-subtasks.body",
  },
];
