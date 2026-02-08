import { useUserProfileMutation } from "@/feature/settings/hooks/useUserProfileMutation";
import { OnboardingAiSection } from "@/feature/onboarding/components/onboarding-ai-section";
import { OnboardingBreakdownSection } from "@/feature/onboarding/components/onboarding-breakdown-section";
import { OnboardingNoteSection } from "@/feature/onboarding/components/onboarding-note-section";
import { router } from "expo-router";
import React, { useState, useRef } from "react";
import { Pressable, Text, View, FlatList, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useLanguageInit } from "@/shared/hooks/useLanguageInit";
import { Ionicons } from "@expo/vector-icons";
import { BlotzLogo } from "@/shared/components/ui/blotz-logo";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function OnboardingScreen() {
  const { setUserOnboarded } = useUserProfileMutation();
  const { t } = useTranslation("onboarding");
  useLanguageInit();

  const sections = ["ai-voice", "star-spark", "breakdown"];
  const [activeOnboardingIndex, setActiveOnboardingIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onMomentumScrollEnd = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveOnboardingIndex(index);
  };

  const handleFinish = async () => {
    await setUserOnboarded(true);
    router.replace("/(protected)/(tabs)");
  };

  const handleNext = () => {
    if (activeOnboardingIndex >= sections.length - 1) {
      handleFinish();
      return;
    }
    const nextIndex = activeOnboardingIndex + 1;
    flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setActiveOnboardingIndex(nextIndex);
  };

  const handleBack = () => {
    if (activeOnboardingIndex === 0) return;
    const prevIndex = activeOnboardingIndex - 1;
    flatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
    setActiveOnboardingIndex(prevIndex);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-6 pt-2 h-12">
        <View className="flex-1 items-start">
          {activeOnboardingIndex > 0 && (
            <Pressable onPress={handleBack} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color="#8C8C8C" />
            </Pressable>
          )}
        </View>
        <BlotzLogo fontSize={30} />
        <View className="flex-1 items-end">
          <Pressable onPress={handleFinish} hitSlop={10}>
            <Text className="text-xl font-baloo text-black/40">{t("actions.skip")}</Text>
          </Pressable>
        </View>
      </View>
      <FlatList
        ref={flatListRef}
        data={sections}
        horizontal
        pagingEnabled
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH }}>
            {item === "ai-voice" && <OnboardingAiSection />}
            {item === "breakdown" && <OnboardingBreakdownSection />}
            {item === "star-spark" && <OnboardingNoteSection />}
          </View>
        )}
      />
      <View className="items-center pb-8 px-6">
        <View className="flex-row items-center mb-16 mt-[-90]">
          {sections.map((section, index) => {
            const isActive = index === activeOnboardingIndex;
            const key = `${section}-${index}`;
            return (
              <View
                key={key}
                className={`${isActive ? "w-2 bg-black" : "w-2 bg-gray-300"} h-2 rounded-full ${
                  index < sections.length - 1 ? "mr-2" : ""
                }`}
              />
            );
          })}
        </View>
        <Pressable onPress={handleNext} className="w-[46%] h-[48px] bg-[#8BCC5A] rounded-full py-4">
          <Text className="text-white text-lg font-baloo text-center">{t("actions.continue")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
