import React, { useState, useEffect } from "react";
import { View, Pressable, Text, useWindowDimensions, Keyboard } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { requestRecordingPermissionsAsync } from "expo-audio";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { AiInputBar } from "../component/ai-input-bar";
import { AiResultList } from "../component/ai-result-list";
import { VoiceHintText } from "../component/voice-hint-text";
import { ListeningIndicator } from "../component/listening-indicator";
import { useAiTaskGenerator } from "../hooks/useAiTaskGenerator";
import { useVoiceRecorder, StopAndUploadResult } from "../hooks/useVoiceRecorder";
import { useAllLabels } from "@/shared/hooks/useAllLabels";
import { useHoldHint } from "../hooks/useHoldHint";
import { mapExtractedTaskDTOToAiTaskDTO } from "../utils/map-extracted-to-task-dto";
import { convertAiTaskToAddTaskItemDTO } from "../utils/map-aitask-to-addtaskitem-dto";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useNotesMutation } from "@/feature/notes/hooks/useNotesMutation";
import Toast from "react-native-toast-message";
import { analytics } from "@/shared/services/analytics";

export default function AiTaskSheetScreen() {
  // --- Hooks ---
  const { t } = useTranslation("aiTaskGenerate");
  const { height } = useWindowDimensions();
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [textInput, setTextInput] = useState("");
  const { isHoldHintVisible, showHoldHint, hideHoldHint } = useHoldHint(1500);
  const { userInput, transcript, streamedTasks, streamedNotes, submitAudioForTranscription, sendTextMessage } = useAiTaskGenerator({
    setIsAiGenerating,
  });
  const { labels } = useAllLabels();
  const { isListening, startListening, stopAndUpload, cancelListening } = useVoiceRecorder(
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
  const displayTasks = streamedTasks.map((task) => mapExtractedTaskDTOToAiTaskDTO(task, labels ?? []));
  const displayNotes = streamedNotes;
  const hasContent = streamedTasks.length > 0 || streamedNotes.length > 0;

  const analyticsPayload = {
    userInput,
    generatedTaskTitles: displayTasks.map((t) => t.title),
    generatedNoteTexts: displayNotes.map((n) => n.text),
  };

  // --- Handlers ---
  const handleDismiss = () => {
    analytics.trackIfUserAcceptAiTask({
      ...analyticsPayload,
      outcome: hasContent ? "rejected" : "abandoned",
    });
    router.back();
  };

  const handleSubmitText = async () => {
    if (!textInput.trim() || isAiGenerating) return;
    const message = textInput.trim();
    setTextInput("");
    Keyboard.dismiss();
    await sendTextMessage(message);
  };

  const handleAddAll = async () => {
    if (isAdding || isNoteCreating) return;
    try {
      await Promise.all([
        ...displayTasks.map((task) => addTaskAsync(convertAiTaskToAddTaskItemDTO(task))),
        ...displayNotes.map((n) => createNoteAsync(n.text)),
      ]);
      analytics.trackIfUserAcceptAiTask({
        ...analyticsPayload,
        outcome: "accepted",
      });
      router.back();
      Toast.show({ type: "warning", text1: t("success.taskAdded") });
    } catch (error) {
      console.error("Add tasks/notes failed", error);
    }
  };

  const handleMicPressIn = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    void startListening();
  };

  const handleMicPressOut = async () => {
    const result = await stopAndUpload();
    if (result === StopAndUploadResult.Short) {
      showHoldHint();
    }
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
              {!hasContent && <VoiceHintText />}

              {/* Task / note cards (streamed or final) */}
              {hasContent && <AiResultList aiTasks={displayTasks} aiNotes={displayNotes} />}

              {isAiGenerating && !!transcript && !hasContent && (
                <Text
                  style={{
                    opacity: 0.7,
                    fontStyle: "italic",
                    color: "white",
                    textAlign: "center",
                    marginHorizontal: 24,
                    marginBottom: 8,
                  }}
                  numberOfLines={3}
                >
                  &ldquo;{transcript}&rdquo;
                </Text>
              )}

              {!hasContent && (
                <ListeningIndicator
                  isListening={isListening}
                  isAiGenerating={isAiGenerating}
                  isHoldHintVisible={isHoldHintVisible}
                />
              )}

              {isAiGenerating && hasContent && (
                <Text style={{ color: "white", opacity: 0.6, fontSize: 13, marginBottom: 8 }}>
                  {t("voiceListening.aiThinking")}…
                </Text>
              )}

              {/* Input bar sticks to the keyboard only */}

              <AiInputBar
                // Text input
                textInput={textInput}
                onChangeText={setTextInput}
                onSubmitText={() => void handleSubmitText()}
                // Mic input
                isListening={isListening}
                setIsHoldHintVisible={(visible) => (visible ? showHoldHint() : hideHoldHint())}
                onMicPressIn={handleMicPressIn}
                onMicPressOut={() => void handleMicPressOut()}
                cancelListening={cancelListening}
                // Results
                hasResults={hasContent}
                onConfirm={() => void handleAddAll()}
                // State
                isAiGenerating={isAiGenerating}
              />
            </View>
          </KeyboardStickyView>
        </LinearGradient>
      </View>
    </View>
  );
}
