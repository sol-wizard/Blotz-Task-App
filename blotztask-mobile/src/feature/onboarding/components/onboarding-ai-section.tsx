import React, { useState } from "react";
import { Keyboard, Pressable, Text, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { Image, ImageBackground } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";
import { ASSETS } from "@/shared/constants/assets";
import { AiResultList } from "@/feature/ai-task-generate/component/ai-result-list";
import { OnboardingMicButton } from "./onboarding-mic-button";
import type { OnboardingVoiceTask } from "../hooks/useOnboardingVoiceTask";

type Props = {
  voice: OnboardingVoiceTask;
};

export function OnboardingAiSection({ voice }: Props) {
  const { t } = useTranslation("onboarding");
  const { t: tAi } = useTranslation("aiTaskGenerate");
  const [textInput, setTextInput] = useState("");

  const isTextMode = voice.inputMode === "text";

  const handleSubmitText = () => {
    const message = textInput;
    setTextInput("");
    Keyboard.dismiss();
    void voice.submitText(message);
  };

  // One line under the drafts: what is happening now, or what to do about what just went wrong.
  const statusText = voice.isRecording
    ? t("ai-voice.listening")
    : voice.isAiGenerating
      ? voice.transcript
        ? `“${voice.transcript}”`
        : t("ai-voice.thinking")
      : voice.isHoldHintVisible
        ? tAi("errors.holdLonger")
        : voice.notice !== "none"
          ? t(`ai-voice.notice.${voice.notice}`)
          : voice.isMicReadyHintVisible
            ? t("ai-voice.micReady")
            : "";

  return (
    <View className="flex-1 pt-2 pb-40">
      <ImageBackground
        source={ASSETS.onboardingVoiceBackground}
        style={{ flex: 1 }}
        contentFit="cover"
      >
        <View className="flex-1 px-6 items-center">
          <Text className="text-3xl font-balooBold text-black text-center mt-6">
            {t("ai-voice.title")}
          </Text>
          <Text className="text-base font-baloo text-black/40 text-center mt-2">
            {t("ai-voice.subtitle")}
          </Text>

          {/* Text input sits above the drafts so the keyboard never covers it. */}
          {isTextMode && !voice.isCreated && (
            <View className="w-full flex-row items-center gap-3 mt-4">
              <TextInput
                autoFocus={!voice.isMicUnavailable}
                value={textInput}
                onChangeText={setTextInput}
                onSubmitEditing={handleSubmitText}
                placeholder={t("ai-voice.inputPlaceholder")}
                placeholderTextColor="rgba(0,0,0,0.3)"
                returnKeyType="send"
                multiline={false}
                editable={!voice.isAiGenerating}
                className={`flex-1 h-14 px-5 rounded-full bg-black/5 text-black font-baloo text-base ${
                  voice.isAiGenerating ? "opacity-40" : "opacity-100"
                }`}
              />
              <Pressable
                onPress={handleSubmitText}
                disabled={voice.isAiGenerating || !textInput.trim()}
                accessibilityRole="button"
                accessibilityLabel={t("ai-voice.send")}
                className={`w-14 h-14 rounded-full items-center justify-center bg-[#8BCC5A] ${
                  voice.isAiGenerating || !textInput.trim() ? "opacity-40" : "opacity-100"
                }`}
              >
                <MaterialCommunityIcons name="arrow-up" size={26} color="white" />
              </Pressable>
            </View>
          )}

          <View className="flex-1 w-full justify-center mt-4" style={{ minHeight: 0 }}>
            {voice.hasDrafts ? (
              <LinearGradient
                colors={["#A3DC2F", "#2F80ED"]}
                start={{ x: 0.3, y: 0 }}
                end={{ x: 0.7, y: 1 }}
                style={{ flex: 1, borderRadius: 24, overflow: "hidden" }}
              >
                <AiResultList
                  aiTasks={voice.tasks}
                  aiRecurringTasks={voice.recurringTasks}
                  aiNotes={voice.notes}
                  onDeleteTask={voice.deleteDraftTask}
                  onDeleteRecurring={voice.deleteDraftRecurringTask}
                  onDeleteNote={voice.deleteDraftNote}
                  // Saved drafts stay on screen but can no longer be swiped away.
                  isGenerating={voice.isAiGenerating || voice.isCreated}
                />
              </LinearGradient>
            ) : (
              !isTextMode && (
                <Image
                  source={ASSETS.onboardingVoice}
                  style={{ flex: 1, width: "100%" }}
                  contentFit="contain"
                />
              )
            )}
          </View>

          <Text
            className={`font-baloo text-base text-center mt-3 min-h-[48px] ${
              voice.isAiGenerating && voice.transcript ? "italic text-black/50" : "text-black/60"
            }`}
            numberOfLines={2}
          >
            {voice.isCreated ? "" : statusText}
          </Text>

          {voice.isCreated ? (
            <View className="flex-row items-center gap-2 mb-2">
              <MaterialCommunityIcons name="check-circle" size={24} color="#8BCC5A" />
              <Text className="font-balooBold text-lg text-black">{t("ai-voice.added")}</Text>
            </View>
          ) : isTextMode ? (
            !voice.isMicUnavailable && (
              <Pressable onPress={voice.switchToVoice} hitSlop={10} disabled={voice.isAiGenerating}>
                <Text className="font-baloo text-base text-black/40 underline">
                  {t("ai-voice.useVoice")}
                </Text>
              </Pressable>
            )
          ) : (
            <>
              <Animated.View style={voice.micShakeStyle}>
                <OnboardingMicButton
                  isRecording={voice.isRecording}
                  disabled={voice.isAiGenerating || voice.isSaving}
                  minHoldMs={voice.minHoldMs}
                  accessibilityLabel={t("ai-voice.holdToTalk")}
                  onPressIn={voice.onMicPressIn}
                  onPressOut={voice.onMicPressOut}
                  onHeldLongEnough={voice.onMicHeldLongEnough}
                />
              </Animated.View>
              <Text className="font-balooBold text-base text-black mt-3">
                {t("ai-voice.holdToTalk")}
              </Text>
              <Pressable
                onPress={voice.switchToText}
                hitSlop={10}
                disabled={voice.isAiGenerating || voice.isRecording}
                className="mt-1"
              >
                <Text className="font-baloo text-base text-black/40 underline">
                  {t("ai-voice.typeInstead")}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </ImageBackground>
    </View>
  );
}
