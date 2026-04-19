import React, { useState, useEffect } from "react";
import { View, Pressable, useWindowDimensions, Keyboard } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { requestRecordingPermissionsAsync } from "expo-audio";
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
  const { isHoldHintVisible, showHoldHint } = useHoldHint(1500);
  const {
    aiGeneratedMessage,
    submitAudioForTranscription,
    sendTextMessage,
  } = useAiTaskGenerator({ setIsAiGenerating });
  const { labels } = useAllLabels();
  const { isListening, startListening, stopAndUpload } = useVoiceRecorder(
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
  const aiTasks = (aiGeneratedMessage?.extractedTasks ?? []).map((task) =>
    mapExtractedTaskDTOToAiTaskDTO(task, labels ?? []),
  );
  const aiNotes = aiGeneratedMessage?.extractedNotes ?? [];
  const hasResults = aiTasks.length > 0 || aiNotes.length > 0;

  const analyticsPayload = {
    userInput: aiGeneratedMessage?.userInput,
    generatedTaskTitles: aiTasks.map((t) => t.title),
    generatedNoteTexts: aiNotes.map((n) => n.text),
  };

  // --- Handlers ---
  const handleDismiss = () => {
    analytics.trackIfUserAcceptAiTask({
      ...analyticsPayload,
      outcome: hasResults ? "rejected" : "abandoned",
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
        ...aiTasks.map((task) => addTaskAsync(convertAiTaskToAddTaskItemDTO(task))),
        ...aiNotes.map((n) => createNoteAsync(n.text)),
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
              {!hasResults && <VoiceHintText />}

              {/* Task / note cards (has results) */}
              {hasResults && (
                <AiResultList
                  aiTasks={aiTasks}
                  aiNotes={aiNotes}
                />
              )}

              <ListeningIndicator
                isListening={isListening}
                isAiGenerating={isAiGenerating}
                isHoldHintVisible={isHoldHintVisible}
              />

              {/* Bottom controls */}
              <AiInputBar
                textInput={textInput}
                isListening={isListening}
                hasResults={hasResults}
                onChangeText={setTextInput}
                onSubmitText={() => void handleSubmitText()}
                onMicPressIn={handleMicPressIn}
                onMicPressOut={() => void handleMicPressOut()}
                onConfirm={() => void handleAddAll()}
              />
            </View>
          </KeyboardStickyView>
        </LinearGradient>
      </View>
    </View>
  );
}
