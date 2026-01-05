import React from "react";
import { View, Text } from "react-native";
import LottieView from "lottie-react-native";
import { ASSETS } from "@/shared/constants/assets";
import { useTranslation } from "react-i18next";

interface TaskListPlaceholderProps {
  selectedStatus: string;
}

export function TaskListPlaceholder({ selectedStatus }: TaskListPlaceholderProps) {
  const { t } = useTranslation("calendar");
  
  // Map status to translation keys
  const getEmptyStateKey = (status: string): string => {
    switch (status) {
      case "all":
        return "all";
      case "todo":
        return "todo";
      case "done":
        return "done";
      default:
        return "default";
    }
  };

  const stateKey = getEmptyStateKey(selectedStatus);
  
  return (
    <View className="flex-1 items-center justify-center px-4">
      <LottieView
        source={ASSETS.emptyBox}
        autoPlay
        loop
        style={{ width: 160, height: 160, marginBottom: 16 }}
      />
      <Text className="text-lg font-semibold text-gray-900 mb-2 text-center">
        {t(`emptyState.${stateKey}.title`)}
      </Text>
      <Text className="text-gray-500 text-center max-w-xs">
        {t(`emptyState.${stateKey}.description`)}
      </Text>
    </View>
  );
}
