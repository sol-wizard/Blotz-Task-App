import React, { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { ReturnButton } from "@/shared/components/return-button";
import LoadingScreen from "@/shared/components/loading-screen";
import { UserAvatar } from "@/shared/components/user-avatar";
import { useCurrentChallenge } from "@/feature/challenge/hooks/useCurrentChallenge";
import {
  useCreateChallenge,
  useJoinChallenge,
} from "@/feature/challenge/hooks/useChallengeMutations";
import { CurrentChallengeDTO } from "@/feature/challenge/models/challenge-dto";

const AVATAR_SIZE = 64;

// Empty slots "breathe" so the team reads as waiting for people; reduced motion keeps only the fade.
const SLOT_REST = { transform: [{ scale: 0.92 }], opacity: 0.55 };
const slotBreath = {
  from: SLOT_REST,
  to: { transform: [{ scale: 1 }], opacity: 1 },
};
const slotBreathReduced = {
  from: { opacity: SLOT_REST.opacity },
  to: { opacity: 1 },
};

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

      {challenge ? <ChallengeTeam challenge={challenge} /> : <ChallengeEntry />}
    </SafeAreaView>
  );
}

type EntryMode = "choose" | "create" | "join";

// No challenge yet: two centred buttons, each opening its own input.
function ChallengeEntry() {
  const { t } = useTranslation(["settings", "common"]);
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

  // On success the current-challenge query refetches and this screen swaps to the team view.
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

// In a challenge: how many are still needed, every member's avatar, and the ID to share.
function ChallengeTeam({ challenge }: { challenge: CurrentChallengeDTO }) {
  const { t } = useTranslation("settings");
  const isFilling = challenge.status === "NotStarted";
  const missing = Math.max(challenge.requiredMembers - challenge.members.length, 0);
  const reducedMotion = useReducedMotion();

  const handleCopy = async () => {
    await Clipboard.setStringAsync(challenge.id);
    Toast.show({ type: "success", text1: t("challenge.copied") });
  };

  return (
    <View className="px-5 mt-2">
      <View className="bg-white rounded-2xl px-5 py-6 items-center">
        <Text className="text-xl font-balooExtraBold text-secondary">{challenge.name}</Text>
        <Text className="text-lg font-balooBold text-secondary mt-3">
          {isFilling ? t("challenge.membersNeeded", { count: missing }) : t("challenge.started")}
        </Text>
        <Text className="text-sm font-baloo text-gray-400 mt-1">
          {challenge.members.length} / {challenge.requiredMembers}
          {isFilling ? ` · ${t("challenge.startsWhenFull")}` : ""}
        </Text>

        <View className="flex-row flex-wrap justify-center gap-4 mt-6">
          {challenge.members.map((member) => (
            <View key={member.userId} className="items-center" style={{ width: AVATAR_SIZE + 8 }}>
              <UserAvatar pictureValue={member.pictureUrl} size={AVATAR_SIZE} />
              <Text numberOfLines={1} className="text-xs font-baloo text-secondary mt-1">
                {member.displayName ?? t("challenge.unnamedMember")}
              </Text>
            </View>
          ))}
          {isFilling &&
            Array.from({ length: missing }, (_, i) => (
              <View key={`empty-${i}`} className="items-center" style={{ width: AVATAR_SIZE + 8 }}>
                <Animated.View
                  style={{
                    width: AVATAR_SIZE,
                    height: AVATAR_SIZE,
                    borderRadius: AVATAR_SIZE / 2,
                    borderWidth: 2,
                    borderColor: "#9AD513",
                    alignItems: "center",
                    justifyContent: "center",
                    // The resting style equals the first keyframe: Reanimated attaches the animation
                    // after the first frame is drawn, and any frame without it must look the same.
                    ...(reducedMotion ? { opacity: SLOT_REST.opacity } : SLOT_REST),
                    animationName: reducedMotion ? slotBreathReduced : slotBreath,
                    animationDuration: "1200ms",
                    animationDirection: "alternate",
                    animationIterationCount: "infinite",
                    animationTimingFunction: "ease-in-out",
                    // Staggered so the empty slots ripple in a wave instead of pulsing in unison.
                    animationDelay: `${i * 150}ms`,
                    animationFillMode: "backwards",
                  }}
                >
                  <MaterialCommunityIcons name="plus" size={28} color="#9AD513" />
                </Animated.View>
              </View>
            ))}
        </View>

        {isFilling && (
          <Pressable
            onPress={handleCopy}
            className="flex-row items-center bg-highlight rounded-2xl px-6 py-3 mt-8"
          >
            <MaterialCommunityIcons name="content-copy" size={18} color="#000" />
            <Text className="text-base font-balooBold text-black ml-2">
              {t("challenge.copyId")}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
