import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { GradientColor } from "@/shared/components/gradient-color";
import { WHATS_NEW_CARDS, WhatsNewCard } from "../content/cards";
import { useWhatsNewSeen } from "../hooks/useWhatsNewSeen";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function ScreenshotCard({ card }: { card: Extract<WhatsNewCard, { type: "screenshot" }> }) {
  const { t } = useTranslation("whatsNew");
  return (
    <View className="flex-1 items-center px-6 pt-4 pb-2">
      <View className="w-full flex-1 rounded-3xl overflow-hidden mb-6">
        <Image source={card.image} style={{ flex: 1, width: "100%" }} contentFit="contain" />
      </View>
      <Text className="text-2xl font-balooBold text-black text-center mb-2">
        {t(card.titleKey)}
      </Text>
      <Text className="text-base font-baloo text-black/40 text-center">{t(card.bodyKey)}</Text>
    </View>
  );
}

function AvatarCard({ card }: { card: Extract<WhatsNewCard, { type: "avatar" }> }) {
  const { t } = useTranslation("whatsNew");
  const { Avatar } = card;
  return (
    <View className="flex-1 items-center justify-center px-6 pb-2">
      <Avatar width={120} height={120} />
      <Text className="text-2xl font-balooBold text-black text-center mt-8 mb-2">
        {t(card.titleKey)}
      </Text>
      <Text className="text-base font-baloo text-black/40 text-center max-w-xs">
        {t(card.bodyKey)}
      </Text>
    </View>
  );
}

export default function WhatsNewScreen() {
  const { markAsSeen } = useWhatsNewSeen();
  const { t } = useTranslation("whatsNew");
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const isLast = activeIndex === WHATS_NEW_CARDS.length - 1;

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  const handleNext = () => {
    if (isLast) {
      handleFinish();
      return;
    }
    const next = activeIndex + 1;
    flatListRef.current?.scrollToIndex({ index: next, animated: true });
    setActiveIndex(next);
  };

  const handleBack = () => {
    if (activeIndex === 0) return;
    const prev = activeIndex - 1;
    flatListRef.current?.scrollToIndex({ index: prev, animated: true });
    setActiveIndex(prev);
  };

  const handleFinish = async () => {
    await markAsSeen();
    router.replace("/(protected)/(tabs)");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-6 h-12" style={{ overflow: "visible" }}>
        <View className="flex-1 items-start">
          {activeIndex > 0 && (
            <Pressable onPress={handleBack} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color="#8C8C8C" />
            </Pressable>
          )}
        </View>
        <GradientColor className="h-[45px] w-[135px] overflow-visible">
          <View className="flex-1 flex-row justify-center items-center bg-transparent">
            <Text className="text-[30px] leading-10 font-balooExtraBold text-center">Blotz</Text>
          </View>
        </GradientColor>
        <View className="flex-1 items-end">
          <Pressable onPress={handleFinish} hitSlop={10}>
            <Text className="text-xl font-baloo text-black/40">{t("actions.skip")}</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={WHATS_NEW_CARDS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
            {item.type === "screenshot" ? (
              <ScreenshotCard card={item} />
            ) : (
              <AvatarCard card={item} />
            )}
          </View>
        )}
        keyExtractor={(_, index) => String(index)}
      />

      <View className="items-center pb-8 px-6">
        <View className="flex-row items-center mb-6">
          {WHATS_NEW_CARDS.map((_, index) => {
            const isActive = index === activeIndex;
            return (
              <View
                key={index}
                className={`${isActive ? "w-5 bg-black" : "w-2 bg-gray-300"} h-2 rounded-full ${
                  index < WHATS_NEW_CARDS.length - 1 ? "mr-2" : ""
                }`}
              />
            );
          })}
        </View>
        <Pressable onPress={handleNext} className="w-[46%] h-[48px] bg-[#8BCC5A] rounded-full py-4">
          <Text className="text-white text-lg font-baloo text-center">
            {isLast ? t("actions.finish") : t("actions.continue")}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
