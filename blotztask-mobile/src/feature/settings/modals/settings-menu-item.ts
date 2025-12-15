import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href } from "expo-router";
import { ComponentProps } from "react";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
export type SettingsMenuKey = "account" | "task-handling" | "notifications" | "under-development";
export type SettingsMenuItem = {
  key: SettingsMenuKey;
  label: string;
  icon: IconName;
  route: Href;
};
