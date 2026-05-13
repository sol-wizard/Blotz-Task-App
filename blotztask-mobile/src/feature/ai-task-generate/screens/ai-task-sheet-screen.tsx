import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  Keyboard,
  Platform,
} from "react-native";
import { KeyboardStickyView, useKeyboardState } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { requestRecordingPermissionsAsync } from "expo-audio";
import { useTranslation } from "react-i18next";
import { LOTTIE_ANIMATIONS } from "@/shared/constants/assets";
import { AiResultList } from "../component/ai-result-list";
import { VoiceHintText } from "../component/voice-hint-text";
import { ListeningIndicator } from "../component/listening-indicator";
import { useAiTaskGenerator } from "../hooks/useAiTaskGenerator";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { useAllLabels } from "@/shared/hooks/useAllLabels";
import { mapExtractedTaskDTOToAiTaskDTO } from "../utils/map-extracted-to-task-dto";
import { convertAiTaskToTaskUpsertDTO } from "../utils/map-aitask-to-addtaskitem-dto";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useNotesMutation } from "@/feature/notes/hooks/useNotesMutation";
import Toast from "react-native-toast-message";
import { analytics } from "@/shared/services/analytics";
import { toastConfig } from "@/shared/components/toast-config";

export default function AiTaskSheetScreen() {
  // --- Hooks ---
  const { t } = useTranslation("aiTaskGenerate");
  const { height } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "android" ? bottom + 16 : 32;
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [textInput, setTextInput] = useState("");
  const hasSubmittedAiRequest = useRef(false);
  const longPressTriggered = useRef(false);
  const { isVisible: isKeyboardVisible } = useKeyboardState();
  const [isHoldHintVisible, setIsHoldHintVisible] = useState(false);
  const {
    userInput,
    transcript,
    streamedTasks,
    streamedNotes,
    submitAudioForTranscription,
    sendTextMessage,
  } = useAiTaskGenerator({
    setIsAiGenerating,
  });
  const { labels } = useAllLabels();
  const { isRecording, startListening, stopAndUpload, cancelListening } = useVoiceRecorder(
    submitAudioForTranscription,
  );
  const { addTaskAsync, isAdding } = useTaskMutations();
  const { createNoteAsync, isNoteCreating } = useNotesMutation();

  // Request mic permission on mount; navigate back if denied
  useEffect(() => {
    requestRecordingPermissionsAsync().then(({ granted }) => {
      if (!granted) {
        console.warn("[Mic] Permission not granted");
        router.back();
      }
    });
  }, []);

  // --- Derived data ---
  const displayTasks = streamedTasks.map((task) =>
    mapExtractedTaskDTOToAiTaskDTO(task, labels ?? []),
  );
  const displayNotes = streamedNotes;
  const hasContent = streamedTasks.length > 0 || streamedNotes.length > 0;

  const analyticsPayload = {
    userInput,
    generatedTasks: displayTasks.map((task) => ({
      title: task.title,
      description: task.description,
      startTime: task.startTime,
      endTime: task.endTime,
      ...(task.label?.name && { labelName: task.label.name }),
    })),
    generatedNoteTexts: displayNotes.map((n) => n.text),
  };

  // --- Handlers ---
  const handleDismiss = () => {
    // Skip analytics only for passive open-and-close sessions with no submitted AI request.
    if (!hasContent && !hasSubmittedAiRequest.current) {
      router.back();
      return;
    }

    analytics.trackIfUserAcceptAiTask({
      ...analyticsPayload,
      outcome: hasContent ? "rejected" : "abandoned",
    });
    router.back();
  };

  const handleSubmitText = async () => {
    if (!textInput.trim() || isAiGenerating) return;
    const message = textInput.trim();
    hasSubmittedAiRequest.current = true;
    setTextInput("");
    Keyboard.dismiss();
    await sendTextMessage(message);
  };

  const handleAddAll = async () => {
    if (isAdding || isNoteCreating) return;
    try {
      await Promise.all([
        ...displayTasks.map((task) => addTaskAsync(convertAiTaskToTaskUpsertDTO(task))),
        ...displayNotes.map((n) => createNoteAsync(n.text)),
      ]);
      analytics.trackIfUserAcceptAiTask({
        ...analyticsPayload,
        outcome: "accepted",
      });
      router.back();
      setTimeout(() => Toast.show({ type: "warning", text1: t("success.taskAdded") }), 0);
    } catch (error) {
      console.error("Add tasks/notes failed", error);
    }
  };

  const handleMicPressIn = () => {
    setIsHoldHintVisible(false);
    void startListening();
  };

  const handleMicPressOut = async () => {
    hasSubmittedAiRequest.current = true;
    await stopAndUpload();
  };

  return (
    <View className="flex-1 bg-transparent">
      <Pressable className="absolute inset-0" onPress={handleDismiss} pointerEvents="auto" />
      <View style={{ flex: 1, justifyContent: "flex-end" }} pointerEvents="box-none">
        <LinearGradient
          colors={["#A3DC2F", "#2F80ED"]}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={{ height: height * 0.8, borderRadius: 20 }}
        >
          <KeyboardStickyView style={{ flex: 1 }}>
            <View className="flex-1 items-center">
              {/* Top row - dismiss button */}
              <View className="w-full items-end px-6 pt-4 pb-2">
                <Pressable onPress={handleDismiss} accessibilityLabel="Stop">
                  <MaterialCommunityIcons name="chevron-down" size={32} color="white" />
                </Pressable>
              </View>

              {/* Hint text (no results) */}
              {!hasContent && (
                <View
                  className={`flex-1 w-full ${isKeyboardVisible ? "opacity-0" : "opacity-100"}`}
                >
                  <VoiceHintText />
                </View>
              )}

              {/* Task / note cards (streamed or final) */}
              {hasContent && <AiResultList aiTasks={displayTasks} aiNotes={displayNotes} />}

              {isAiGenerating && !!transcript && !hasContent && (
                <Text className="mx-6 mb-2 text-center italic text-white/70" numberOfLines={3}>
                  &ldquo;{transcript}&rdquo;
                </Text>
              )}

              {!hasContent && (
                <ListeningIndicator
                  isRecording={isRecording}
                  isAiGenerating={isAiGenerating}
                  isHoldHintVisible={isHoldHintVisible}
                />
              )}

              {isAiGenerating && hasContent && (
                <Text className="mb-2 text-[13px] text-white/60">
                  {t("voiceListening.aiThinking")}…
                </Text>
              )}

              {/* Input bar sticks to the keyboard only */}

              <View
                className="w-full flex-row items-center px-6 gap-4"
                style={{ paddingBottom: bottomPadding }}
              >
                <View className="flex-1 flex-row items-center gap-4">
                  {/* Microphone hold-to-record */}
                  <Pressable
                    onPressIn={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      longPressTriggered.current = false;
                      handleMicPressIn();
                    }}
                    onPressOut={() => {
                      if (!longPressTriggered.current) {
                        setIsHoldHintVisible(true);
                        cancelListening();
                        console.log(
                          "👆 [Mic] Press out before long press threshold, showing hold hint.",
                        );
                      } else {
                        void handleMicPressOut();
                      }
                    }}
                    onLongPress={() => {
                      longPressTriggered.current = true;
                    }}
                    delayLongPress={1000}
                    className="w-14 h-14 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: isRecording
                        ? "rgba(255,255,255,0.5)"
                        : "rgba(255,255,255,0.25)",
                      opacity: isAiGenerating ? 0.4 : 1,
                    }}
                    disabled={isAiGenerating}
                  >
                    <MaterialCommunityIcons name="microphone" size={28} color="white" />
                  </Pressable>

                  {/* Text input / waveform */}
                  <View className="flex-1 items-center justify-center">
                    {isRecording ? (
                      <LottieView
                        source={LOTTIE_ANIMATIONS.voiceWave}
                        loop
                        autoPlay
                        style={{ width: "100%", height: 40 }}
                        resizeMode="contain"
                      />
                    ) : (
                      <TextInput
                        value={textInput}
                        onChangeText={setTextInput}
                        onSubmitEditing={() => void handleSubmitText()}
                        placeholder={t("input.placeholder")}
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        returnKeyType="send"
                        multiline={false}
                        editable={!isAiGenerating}
                        className={`w-full text-white font-baloo text-base px-4 bg-white/25 rounded-full h-14 ${isAiGenerating ? "opacity-40" : "opacity-100"}`}
                      />
                    )}
                  </View>
                </View>
                {hasContent && (
                  <Pressable
                    onPress={() => void handleAddAll()}
                    accessibilityLabel="Confirm"
                    className="w-14 h-14 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.25)",
                      opacity: isAiGenerating ? 0.4 : 1,
                    }}
                    disabled={isAiGenerating}
                  >
                    <MaterialCommunityIcons name="check" size={28} color="white" />
                  </Pressable>
                )}
              </View>
            </View>
          </KeyboardStickyView>
        </LinearGradient>
      </View>
      <Toast config={toastConfig} position="bottom" bottomOffset={120} />
    </View>
  );
}
