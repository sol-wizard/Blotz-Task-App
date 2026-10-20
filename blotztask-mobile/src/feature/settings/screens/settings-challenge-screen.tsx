import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ReturnButton } from "@/shared/components/return-button";
import LoadingScreen from "@/shared/components/loading-screen";
import { useCurrentChallenge } from "@/feature/challenge/hooks/useCurrentChallenge";
import { ChallengeEntry } from "@/feature/settings/components/challenge/challenge-entry";
import { ChallengeTeam } from "@/feature/settings/components/challenge/challenge-team";
import { ChallengeProgress } from "@/feature/settings/components/challenge/challenge-progress";

export default function SettingsChallengeScreen() {
  const { t } = useTranslation("settings");
  const { challenge, isLoading } = useCurrentChallenge();

  if (isLoading) return <LoadingScreen />;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center px-5 py-4">
        <ReturnButton />
        <Text className="text-2xl font-balooBold text-secondary ml-3">{t("challenge.title")}</Text>
      </View>

      {!challenge ? (
        <ChallengeEntry />
      ) : challenge.status === "NotStarted" ? (
        <ChallengeTeam challenge={challenge} />
      ) : (
        <ChallengeProgress challenge={challenge} />
      )}
    </SafeAreaView>
  );
}
