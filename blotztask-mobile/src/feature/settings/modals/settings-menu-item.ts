import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { Href } from "expo-router";
import { ComponentProps } from "react";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
export type SettingsMenuKey =
  | "account"
  | "beta-features"
  | "task-handling"
  | "notifications"
  | "language"
  | "about";
export type SettingsMenuItem = {
  key: SettingsMenuKey;
  label: string;
  icon: IconName;
  route: Href;
};
