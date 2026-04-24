import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";

type Props = {
  isListening: boolean;
  isAiGenerating: boolean;
  isHoldHintVisible: boolean;
};

export function ListeningIndicator({ isListening, isAiGenerating, isHoldHintVisible }: Props) {
  const { t } = useTranslation("aiTaskGenerate");
  const isActive = isListening || isAiGenerating;

  return (
    <View className="items-center px-8 pb-4">
      <Text
        className="text-white font-balooBold text-xl mb-1"
        style={{ opacity: isActive ? 1 : 0 }}
      >
        {isAiGenerating ? t("voiceListening.aiThinking") : t("voiceListening.title")}
      </Text>
      <Text
        className="text-white/70 font-baloo text-sm text-center"
        style={{ opacity: isActive || isHoldHintVisible ? 1 : 0 }}
      >
        {isHoldHintVisible ? t("errors.holdLonger") : t("voiceListening.subtitle")}
      </Text>
    </View>
  );
}
