import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { Href } from "expo-router";
import { ComponentProps } from "react";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
export type SettingsMenuKey =
  | "account"
  | "review"
  | "beta-features"
  | "task-handling"
  | "notifications"
  | "language"
  | "invite"
  | "support-us"
  | "about";
export type SettingsMenuItem = {
  key: SettingsMenuKey;
  label: string;
  icon: IconName;
  route: Href;
};
