import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { ASSETS } from "@/shared/constants/assets";
import { GradientCircle } from "@/shared/components/gradient-circle";
import { ReturnButton } from "@/shared/components/return-button";
import { ExecutionChatPanel } from "../components/execution-chat-panel";
import { AvailableAiCoachMode } from "../models/ai-coach-dto";

interface ModeCardProps {
  title: string;
  subtitle: string;
  disabled: boolean;
  selected?: boolean;
  comingSoonLabel?: string;
  onPress?: () => void;
}

function ModeCard({
  title,
  subtitle,
  disabled,
  selected,
  comingSoonLabel,
  onPress,
}: ModeCardProps) {
  return (
    <Pressable
      className={`bg-white rounded-2xl px-5 py-4 mb-3 shadow-sm border ${
        selected ? "border-highlight" : "border-gray-100"
      } ${disabled ? "opacity-50" : ""}`}
      disabled={disabled}
      onPress={onPress}
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-balooBold text-base text-secondary flex-1 pr-2">{title}</Text>
        {selected && (
          <View className="bg-highlight rounded-full px-2 py-0.5">
            <Text className="font-baloo text-xs text-white">✓</Text>
          </View>
        )}
        {disabled && comingSoonLabel && (
          <View className="bg-gray-100 rounded-full px-2 py-0.5">
            <Text className="font-baloo text-xs text-primary">{comingSoonLabel}</Text>
          </View>
        )}
      </View>
      <Text className="font-baloo text-sm text-primary mt-1">{subtitle}</Text>
    </Pressable>
  );
}

/**
 * AI Home (requirements §6, single-page per PM decision 2026-08-22): greeting, Blotz IP, the
 * three mode cards AND the chat live on one page. The input bar is visible from the start but
 * greyed out; tapping a mode activates it and the conversation grows in place below the cards —
 * no view swap, no navigation. Execution and Companion are available; Clarify is coming-soon.
 */
export default function AiHomeScreen() {
  const { t } = useTranslation("aiCoach");
  const [selectedMode, setSelectedMode] = useState<AvailableAiCoachMode | null>(null);

  const header = (
    <View className="px-1">
      <View className="items-center mt-4 mb-6">
        <GradientCircle size={72}>
          <ASSETS.whiteBun width={36} height={36} style={{ position: "absolute" } as const} />
        </GradientCircle>
        <Text className="font-balooBold text-xl text-secondary mt-3">{t("home.greeting")}</Text>
        <Text className="font-baloo text-sm text-primary mt-1 text-center">{t("home.intro")}</Text>
      </View>

      <ModeCard
        title={t("home.modes.execution.title")}
        subtitle={t("home.modes.execution.subtitle")}
        disabled={false}
        selected={selectedMode === "Execution"}
        onPress={() => setSelectedMode("Execution")}
      />
      <ModeCard
        title={t("home.modes.clarify.title")}
        subtitle={t("home.modes.clarify.subtitle")}
        disabled
        comingSoonLabel={t("home.comingSoon")}
      />
      <ModeCard
        title={t("home.modes.companion.title")}
        subtitle={t("home.modes.companion.subtitle")}
        disabled={false}
        selected={selectedMode === "Companion"}
        onPress={() => setSelectedMode("Companion")}
      />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 mt-2">
        <ReturnButton onPress={() => router.back()} />
      </View>

      <ExecutionChatPanel key={selectedMode ?? "unselected"} mode={selectedMode} header={header} />
    </SafeAreaView>
  );
}
