// @/feature/pomodoro/components/switch-task-modal.tsx
import React from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { useTranslation } from "react-i18next";

interface SwitchTaskModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const SwitchTaskModal = ({ isVisible, onClose, onConfirm }: SwitchTaskModalProps) => {
  const { t } = useTranslation("pomodoro");

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 items-center justify-center px-10">
        <View className="bg-white rounded-[32px] p-8 w-full items-center shadow-xl">
          <Text className="text-2xl font-balooBold text-secondary mb-4 text-center">
            {t("focusMode.switchTaskTitle")}
          </Text>
          <Text className="text-base font-inter text-neutral-500 text-center mb-10 leading-6">
            {t("focusMode.switchTaskMessage")}
          </Text>

          <View className="flex-row gap-4 w-full">
            <Pressable
              onPress={onClose}
              className="flex-1 h-14 bg-neutral-100 rounded-2xl items-center justify-center"
            >
              <Text className="font-inter font-bold text-neutral-400">{t("focusMode.cancel")}</Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              className="flex-1 h-14 bg-checked rounded-2xl items-center justify-center"
            >
              <Text className="font-inter font-bold text-white">{t("focusMode.confirm")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
