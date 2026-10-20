import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "@/shared/components/user-avatar";
import { CurrentChallengeDTO } from "@/feature/challenge/models/challenge-dto";

// Team is full: one progress bar per member, a segment per challenge day, filled when they were active.
// The backend judges the challenge on every load, so this response can already be Succeeded or Failed.
export function ChallengeProgress({ challenge }: { challenge: CurrentChallengeDTO }) {
  const { t } = useTranslation("settings");

  const summary =
    challenge.status === "Succeeded"
      ? t("challenge.succeeded")
      : challenge.status === "Failed"
        ? t("challenge.failed")
        : t("challenge.inProgress");

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
      <View className="bg-white rounded-2xl px-5 py-6 mt-2">
        <Text className="text-xl font-balooExtraBold text-secondary text-center">
          {challenge.name}
        </Text>
        <Text
          className={`text-base font-balooBold text-center mt-2 ${
            challenge.status === "Failed" ? "text-warning" : "text-secondary"
          }`}
        >
          {summary}
        </Text>

        <View className="mt-6 gap-5">
          {challenge.members.map((member) => (
            <View key={member.userId}>
              <View className="flex-row items-center mb-2">
                <UserAvatar pictureValue={member.pictureUrl} size={32} />
                <Text numberOfLines={1} className="flex-1 text-sm font-baloo text-secondary ml-2">
                  {member.displayName ?? t("challenge.unnamedMember")}
                </Text>
                <Text className="text-xs font-baloo text-gray-400">
                  {member.activeDays.filter(Boolean).length} / {challenge.periodDays}
                </Text>
              </View>
              <View className="flex-row gap-1">
                {member.activeDays.map((isActive, day) => (
                  <View
                    key={day}
                    className={`flex-1 h-2.5 rounded-full ${isActive ? "bg-highlight" : "bg-gray-200"}`}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
