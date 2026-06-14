import React, { ComponentProps } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type ActionChoice = {
  key: string;
  title: string;
  description?: string;
  icon?: IconName;
  destructive?: boolean;
  onPress: () => void;
};

type ActionChoiceSheetProps = {
  visible: boolean;
  title: string;
  message?: string;
  actions: ActionChoice[];
  cancelText: string;
  onClose: () => void;
};

export function ActionChoiceSheet({
  visible,
  title,
  message,
  actions,
  cancelText,
  onClose,
}: ActionChoiceSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-background rounded-t-[32px] px-4 pt-4 pb-10">
          <View className="items-center pb-4">
            <View className="h-1.5 w-12 rounded-full bg-gray-300" />
          </View>

          <View className="px-2 pb-4">
            <Text className="font-balooBold text-2xl text-[#444964]">{title}</Text>
            {message ? (
              <Text className="font-inter text-sm leading-5 text-gray-500 mt-1">{message}</Text>
            ) : null}
          </View>

          <View className="gap-3">
            {actions.map((action) => {
              const color = action.destructive ? "#F56767" : "#444964";
              const iconBackground = action.destructive ? "#FFF0F0" : "#EEF8D9";
              const iconColor = action.destructive ? "#F56767" : "#84CC16";

              return (
                <Pressable
                  key={action.key}
                  onPress={action.onPress}
                  className="min-h-[72px] flex-row items-center rounded-2xl bg-white px-4 py-3"
                >
                  {action.icon ? (
                    <View
                      className="h-11 w-11 items-center justify-center rounded-2xl mr-3"
                      style={{ backgroundColor: iconBackground }}
                    >
                      <MaterialCommunityIcons name={action.icon} size={23} color={iconColor} />
                    </View>
                  ) : null}

                  <View className="flex-1 pr-3">
                    <Text className="font-inter font-bold text-base" style={{ color }}>
                      {action.title}
                    </Text>
                    {action.description ? (
                      <Text className="font-inter text-sm leading-5 text-gray-400 mt-0.5">
                        {action.description}
                      </Text>
                    ) : null}
                  </View>

                  <MaterialCommunityIcons name="chevron-right" size={22} color="#C7C9D6" />
                </Pressable>
              );
            })}

            <Pressable
              onPress={onClose}
              className="h-14 items-center justify-center rounded-2xl bg-white/70"
            >
              <Text className="font-inter font-bold text-gray-400">{cancelText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
