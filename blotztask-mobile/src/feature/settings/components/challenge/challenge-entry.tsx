import React, { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  useCreateChallenge,
  useJoinChallenge,
} from "@/feature/challenge/hooks/useChallengeMutations";

type EntryMode = "choose" | "create" | "join";

// No challenge yet: two centred buttons, each opening its own input, plus a link to past challenges.
export function ChallengeEntry() {
  const { t } = useTranslation(["settings", "common"]);
  const router = useRouter();
  const [mode, setMode] = useState<EntryMode>("choose");
  const [value, setValue] = useState("");
  const { createChallenge, isCreating } = useCreateChallenge();
  const { joinChallenge, isJoining } = useJoinChallenge();

  const isSubmitting = isCreating || isJoining;
  const trimmed = value.trim();

  const open = (next: EntryMode) => {
    setValue("");
    setMode(next);
  };

  // On success the current-challenge query refetches and the screen swaps to the team view.
  const submit = () => {
    if (!trimmed) return;
    if (mode === "create") createChallenge(trimmed);
    if (mode === "join") joinChallenge(trimmed);
  };

  if (mode === "choose") {
    return (
      <View className="flex-1 justify-center px-8 gap-4">
        <Pressable
          onPress={() => open("create")}
          className="bg-highlight rounded-2xl py-4 items-center"
        >
          <Text className="text-lg font-balooBold text-black">{t("challenge.create")}</Text>
        </Pressable>
        <Pressable onPress={() => open("join")} className="bg-white rounded-2xl py-4 items-center">
          <Text className="text-lg font-balooBold text-secondary">{t("challenge.join")}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/settings/challenge-history")}
          hitSlop={8}
          className="items-center py-2"
        >
          <Text className="text-base font-baloo text-secondary underline">
            {t("challenge.history")}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center px-8">
      <TextInput
        autoFocus
        value={value}
        onChangeText={setValue}
        maxLength={mode === "create" ? 100 : undefined}
        autoCapitalize={mode === "join" ? "none" : "sentences"}
        autoCorrect={mode === "create"}
        placeholder={
          mode === "create" ? t("challenge.namePlaceholder") : t("challenge.codePlaceholder")
        }
        className="bg-white rounded-2xl px-4 py-3 text-lg font-baloo text-secondary"
      />
      <View className="flex-row gap-3 mt-4">
        <Pressable
          onPress={() => setMode("choose")}
          className="flex-1 bg-white rounded-2xl py-3 items-center"
        >
          <Text className="text-base font-baloo text-secondary">{t("common:buttons.cancel")}</Text>
        </Pressable>
        <Pressable
          disabled={!trimmed || isSubmitting}
          onPress={submit}
          className={`flex-1 rounded-2xl py-3 items-center ${trimmed ? "bg-highlight" : "bg-gray-200"} ${
            isSubmitting ? "opacity-70" : ""
          }`}
        >
          <Text className={`text-base font-balooBold ${trimmed ? "text-black" : "text-gray-500"}`}>
            {mode === "create" ? t("challenge.confirmCreate") : t("challenge.confirmJoin")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
