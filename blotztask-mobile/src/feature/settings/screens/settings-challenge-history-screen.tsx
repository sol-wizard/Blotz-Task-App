import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ReturnButton } from "@/shared/components/return-button";
import LoadingScreen from "@/shared/components/loading-screen";
import { useChallengeHistory } from "@/feature/challenge/hooks/useChallengeHistory";

export default function SettingsChallengeHistoryScreen() {
  const { t } = useTranslation("settings");
  const { history, isLoading } = useChallengeHistory();

  if (isLoading) return <LoadingScreen />;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center px-5 py-4">
        <ReturnButton />
        <Text className="text-2xl font-balooBold text-secondary ml-3">
          {t("challenge.historyTitle")}
        </Text>
      </View>

      {history.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-base font-baloo text-gray-400">{t("challenge.historyEmpty")}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 12 }}>
          {history.map((item) => {
            const succeeded = item.status === "Succeeded";
            return (
              <View
                key={item.id}
                className="bg-white rounded-2xl px-5 py-4 flex-row items-center justify-between"
              >
                <View className="flex-1 mr-3">
                  <Text numberOfLines={1} className="text-lg font-balooBold text-secondary">
                    {item.name}
                  </Text>
                  <Text className="text-xs font-baloo text-gray-400 mt-1">
                    {item.startTime ? `${format(new Date(item.startTime), "yyyy-MM-dd")} – ` : ""}
                    {format(new Date(item.endTime), "yyyy-MM-dd")}
                  </Text>
                </View>
                <View
                  className={`rounded-full px-3 py-1 ${succeeded ? "bg-highlight" : "bg-warning"}`}
                >
                  <Text
                    className={`text-sm font-balooBold ${succeeded ? "text-black" : "text-white"}`}
                  >
                    {succeeded ? t("challenge.statusSucceeded") : t("challenge.statusFailed")}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
