import React from "react";
import { Pressable, View, Text } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";

export enum ActionButtonType {
  Edit = "edit",
  Delete = "delete",
}

type ActionButtonConfig = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  bgColor: string;
  iconColor: string;
};

export const ACTION_BUTTON_CONFIG: Record<ActionButtonType, ActionButtonConfig> = {
  [ActionButtonType.Edit]: {
    icon: "calendar-plus",
    label: "noteActions.addToTask",
    bgColor: "#8BC34A",
    iconColor: "#FFFFFF",
  },
  [ActionButtonType.Delete]: {
    icon: "trash-can-outline",
    label: "noteActions.delete",
    bgColor: "#F0625F",
    iconColor: "#FFFFFF",
  },
};

type Props = {
  type: ActionButtonType;
  onPress: () => void;
};

export const ActionButton = ({ type, onPress }: Props) => {
  const config = ACTION_BUTTON_CONFIG[type];
  const { t } = useTranslation("notes");
  return (
    <Pressable onPress={onPress} className="items-center">
      <View
        className="w-[38px] h-[38px] rounded-full items-center justify-center"
        style={{ backgroundColor: config.bgColor }}
      >
        <MaterialCommunityIcons
          name={config.icon}
          size={18}
          color={config.iconColor}
          label={config.label}
        />
      </View>

      <Text className="mt-1 text-xs font-baloo text-gray-500">
        {t(config.label)}
      </Text>
    </Pressable>
  );
};