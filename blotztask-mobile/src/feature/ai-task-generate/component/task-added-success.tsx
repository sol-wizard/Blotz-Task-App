import { ASSETS } from "@/shared/constants/assets";
import React from "react";
import { View, Image, Text } from "react-native";
import { useTranslation } from "react-i18next";

export const TaskAddedSuccess = () => {
  const { t } = useTranslation("aiTaskGenerate");

  return (
    <View className="items-center justify-center min-h-96">
      <Image source={ASSETS.successBun} className="w-56 h-24" style={{ resizeMode: "contain" }} />
      <Text className="pt-14 text-3xl leading-[20px] text-secondary text-center font-balooBold">
        {t("success.taskAdded")}
      </Text>
    </View>
  );
};
