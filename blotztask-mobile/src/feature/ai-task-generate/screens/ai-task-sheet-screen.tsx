import React, { useState, useEffect } from "react";
import { View, Text, Pressable, useWindowDimensions, Keyboard } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { requestRecordingPermissionsAsync } from "expo-audio";
import { useTranslation } from "react-i18next";
import { AiInputBar } from "../component/ai-input-bar";
import { AiResultList } from "../component/ai-result-list";
import { VoiceHintText } from "../component/voice-hint-text";
import { useAiTaskGenerator } from "../hooks/useAiTaskGenerator";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { useAllLabels } from "@/shared/hooks/useAllLabels";
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

  const analyticsResultsPayload = {
    userInput: aiGeneratedMessage?.userInput,
    generatedTaskTitles: aiTasks.map((t) => t.title),
    generatedNoteTexts: aiNotes.map((n) => n.text),
  };

  // --- Handlers ---
  const handleDismiss = () => {
    analytics.trackIfUserAcceptAiTask({
      ...analyticsResultsPayload,
      outcome: hasResults ? "rejected" : "abandoned",
    });
    router.back();
  };

  const handleSubmitText = async () => {
    if (!textInput.trim() || isAiGenerating) return;
    Keyboard.dismiss();
    await sendTextMessage(textInput.trim());
    setTextInput("");
  };

  const handleAddAll = async () => {
    if (isAdding || isNoteCreating) return;
    try {
      await Promise.all([
        ...aiTasks.map((task) => addTaskAsync(convertAiTaskToAddTaskItemDTO(task))),
        ...aiNotes.map((n) => createNoteAsync(n.text)),
      ]);
      analytics.trackIfUserAcceptAiTask({
        ...analyticsResultsPayload,
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

              {/* Listening indicator */}
              <View className="items-center px-8 pb-4">
                <Text
                  className="text-white font-balooBold text-xl mb-1"
                  style={{ opacity: isListening || isAiGenerating ? 1 : 0 }}
                >
                  {isAiGenerating ? t("voiceListening.aiThinking") : t("voiceListening.title")}
                </Text>
                <Text
                  className="text-white/70 font-baloo text-sm text-center"
                  style={{ opacity: isListening || isAiGenerating ? 1 : 0 }}
                >
                  {t("voiceListening.subtitle")}
                </Text>
              </View>

              {/* Bottom controls */}
              <AiInputBar
                textInput={textInput}
                isListening={isListening}
                hasResults={hasResults}
                onChangeText={setTextInput}
                onSubmitText={() => void handleSubmitText()}
                onMicPressIn={handleMicPressIn}
                onMicPressOut={() => void stopAndUpload()}
                onConfirm={() => void handleAddAll()}
              />
            </View>
          </KeyboardStickyView>
        </LinearGradient>
      </View>
    </View>
  );
}
