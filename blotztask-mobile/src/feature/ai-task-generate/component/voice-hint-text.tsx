import React, { useState, useEffect, useRef } from "react";
import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";

export const VoiceHintText = () => {
  const { t } = useTranslation("aiTaskGenerate");
  const hintText = t("voiceHint.hintText");

  const [displayedHint, setDisplayedHint] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayedHint("");
    indexRef.current = 0;

    const interval = setInterval(() => {
      indexRef.current += 1;
      setDisplayedHint(hintText.slice(0, indexRef.current));
      if (indexRef.current >= hintText.length) clearInterval(interval);
    }, 40);

    return () => clearInterval(interval);
  }, [hintText]);

  return (
    <View className="flex-1 w-full items-center justify-center px-8">
      <Text className="text-white/60 font-baloo text-base mb-2">{t("voiceHint.trySaying")}</Text>
      <View style={{ minHeight: 72 }} className="w-full items-center">
        <Text className="text-white font-balooBold text-2xl text-center">{displayedHint}</Text>
      </View>
    </View>
  );
};
