import React from "react";
import { View, Text, Pressable } from "react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { UserAvatar } from "@/shared/components/user-avatar";
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

// Still filling up: how many are still needed, every member's avatar, and the ID to share.
export function ChallengeTeam({ challenge }: { challenge: CurrentChallengeDTO }) {
  const { t } = useTranslation("settings");
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
          {t("challenge.membersNeeded", { count: missing })}
        </Text>
        <Text className="text-sm font-baloo text-gray-400 mt-1">
          {challenge.members.length} / {challenge.requiredMembers} · {t("challenge.startsWhenFull")}
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
          {Array.from({ length: missing }, (_, i) => (
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

        <Pressable
          onPress={handleCopy}
          className="flex-row items-center bg-highlight rounded-2xl px-6 py-3 mt-8"
        >
          <MaterialCommunityIcons name="content-copy" size={18} color="#000" />
          <Text className="text-base font-balooBold text-black ml-2">{t("challenge.copyId")}</Text>
        </Pressable>
      </View>
    </View>
  );
}
