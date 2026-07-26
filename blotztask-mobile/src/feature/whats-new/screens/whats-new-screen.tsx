import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { View, Text } from "react-native";
import { IntroCarousel } from "@/shared/components/intro-carousel";
import { WHATS_NEW_CARDS, WhatsNewCard } from "../content/cards";

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
        card.type === "screenshot" ? (
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
