import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ComponentProps } from "react";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
export type MenuKey = "account" | "task-handling" | "notifications" | "under-development";
export type MenuItem = { key: MenuKey; label: string; icon: IconName };
