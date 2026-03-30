import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { useTranslation } from "react-i18next";

interface DeadlineWarningAlertProps {
  visible: boolean;
  isEvent?: boolean;
  onClose: () => void;
}

export const DeadlineWarningAlert = ({ visible, isEvent, onClose }: DeadlineWarningAlertProps) => {
  const { t } = useTranslation("tasks");

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      exiting={FadeOutDown.duration(300)}
      className="absolute self-center z-50 bg-white rounded-[24px] p-5 shadow-sm border border-gray-200"
      style={{
        width: "90%",
        top: -60,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
      }}
    >
      <View className="items-center mr-4">
        <Text className="font-balooBold text-lg text-primary text-center">
          {t("form.deadlineWarning")}
        </Text>
        <Text className="font-baloo text-base text-secondary text-center mt-1">
          {isEvent ? t("form.eventWarningDesc") : t("form.deadlineWarningDesc")}
        </Text>
      </View>
      <Pressable 
        onPress={onClose} 
        className="absolute top-4 right-4 p-1 bg-gray-100 rounded-full"
        accessibilityRole="button"
        accessibilityLabel={t("form.closeWarning")}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialCommunityIcons name="close" size={16} color="#4B5563" />
      </Pressable>
    </Animated.View>
  );
};
