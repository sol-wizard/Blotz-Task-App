import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href } from "expo-router";
import { ComponentProps } from "react";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
export type SettingsMenuKey =
  | "account"
  | "beta-features"
  | "task-handling"
  | "notifications"
  | "language"
  | "share-app"
  | "about";

type BaseSettingsMenuItem = {
  key: SettingsMenuKey;
  label: string;
  icon: IconName;
  rightIcon?: IconName;
};

type SettingsRouteMenuItem = BaseSettingsMenuItem & {
  route: Href;
  onPress?: never;
};

type SettingsActionMenuItem = BaseSettingsMenuItem & {
  onPress: () => void;
  route?: never;
};

export type SettingsMenuItem = SettingsRouteMenuItem | SettingsActionMenuItem;
