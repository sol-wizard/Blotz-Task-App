import React, { useEffect } from "react";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { View, Text, type DimensionValue } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import LottieView from "lottie-react-native";
import { IntroCarousel } from "@/shared/components/intro-carousel";
import { WHATS_NEW_CARDS, WhatsNewCard } from "../content/cards";
import { LOTTIE_ANIMATIONS, PNGIMAGES } from "@/shared/constants/assets";

type SparkleStarProps = {
  source: number;
  top?: DimensionValue;
  left?: DimensionValue;
  right?: DimensionValue;
  delay: number;
  size?: number;
};

function SparkleStar({ source, top, left, right, delay, size = 20 }: SparkleStarProps) {
  const opacity = useSharedValue(0.3);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 900 }), withTiming(0.3, { duration: 900 })),
        -1,
        false
      )
    );
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1.25, { duration: 900 }), withTiming(0.8, { duration: 900 })),
        -1,
        false
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View className="absolute" style={[{ top, left, right }, animStyle]}>
      <Image source={source} style={{ width: size, height: size }} contentFit="contain" />
    </Animated.View>
  );
}

function IntroCard({ card }: { card: Extract<WhatsNewCard, { type: "intro" }> }) {
  const { t } = useTranslation("whatsNew");
  const { Avatar } = card;

  const bobY = useSharedValue(0);

  useEffect(() => {
    bobY.value = withRepeat(
      withSequence(withTiming(-8, { duration: 1500 }), withTiming(0, { duration: 1500 })),
      -1,
      false
    );
  }, []);

  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bobY.value }],
  }));

  return (
    <View className="flex-1 items-center justify-center overflow-hidden px-6 pb-2">
      <View className="absolute inset-0" pointerEvents="none">
        <LottieView
          source={LOTTIE_ANIMATIONS.fireworkTask}
          autoPlay
          loop={false}
          resizeMode="cover"
          style={{ flex: 1 }}
        />
      </View>

      <SparkleStar source={PNGIMAGES.yellowStar} top="14%" left="12%" delay={0} size={22} />
      <SparkleStar source={PNGIMAGES.greenStar} top="20%" right="14%" delay={500} size={18} />
      <SparkleStar source={PNGIMAGES.blueStar} top="42%" left="6%" delay={900} size={16} />
      <SparkleStar source={PNGIMAGES.purpleStar} top="38%" right="8%" delay={300} size={20} />
      <SparkleStar source={PNGIMAGES.rainbowStar} top="10%" right="24%" delay={700} size={14} />

      <Animated.View style={bobStyle}>
        <Avatar width={140} height={140} />
      </Animated.View>

      <Text className="text-2xl font-balooBold text-black text-center mt-8 mb-5">
        {t(card.titleKey)}
      </Text>
      <Text className="text-base font-baloo text-black/40 text-center max-w-xs">
        {t(card.bodyKey)}
      </Text>
    </View>
  );
}

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

interface WhatsNewScreenProps {
  onFinish: () => Promise<void>;
}

export default function WhatsNewScreen({ onFinish }: WhatsNewScreenProps) {
  const { t } = useTranslation("whatsNew");

  return (
    <IntroCarousel<WhatsNewCard>
      data={WHATS_NEW_CARDS}
      renderItem={(card) =>
        card.type === "intro" ? (
          <IntroCard card={card} />
        ) : card.type === "screenshot" ? (
          <ScreenshotCard card={card} />
        ) : (
          <AvatarCard card={card} />
        )
      }
      onFinish={onFinish}
      continueLabel={t("actions.continue")}
      finishLabel={t("actions.finish")}
      skipLabel={t("actions.skip")}
    />
  );
}
