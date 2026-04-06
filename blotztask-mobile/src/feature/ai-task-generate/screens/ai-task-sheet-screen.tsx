import React, { useState, useEffect, useMemo } from "react";
import { View, Text, Pressable, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { LOTTIE_ANIMATIONS } from "@/shared/constants/assets";
import { router } from "expo-router";
import { requestRecordingPermissionsAsync } from "expo-audio";
import { useTranslation } from "react-i18next";
import { AiTaskDTO } from "../models/ai-task-dto";
import { AiNoteDTO } from "../models/ai-result-message-dto";
import { AiResultCard } from "../component/ai-result-card";
import { VoiceHintText } from "../component/voice-hint-text";
import { useAiTaskGenerator } from "../hooks/useAiTaskGenerator";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { useAllLabels } from "@/shared/hooks/useAllLabels";
import { mapExtractedTaskDTOToAiTaskDTO } from "../utils/map-extracted-to-task-dto";
import { convertAiTaskToAddTaskItemDTO } from "../utils/map-aitask-to-addtaskitem-dto";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useNotesMutation } from "@/feature/notes/hooks/useNotesMutation";
import Toast from "react-native-toast-message";

export default function AiTaskSheetScreen() {
  const { t } = useTranslation("aiTaskGenerate");
  const { height } = useWindowDimensions();

  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const { aiGeneratedMessage, transcribeAudio } = useAiTaskGenerator({ setIsAiGenerating });
  const { labels } = useAllLabels();

  const { isListening, startListening, stopAndUpload } = useVoiceRecorder(transcribeAudio);
  const { addTaskAsync, isAdding } = useTaskMutations();
  const { createNoteAsync, isNoteCreating } = useNotesMutation();

  const [localTasks, setLocalTasks] = useState<AiTaskDTO[]>([]);
  const [localNotes, setLocalNotes] = useState<AiNoteDTO[]>([]);

  const aiTasks = useMemo(
    () =>
      (aiGeneratedMessage?.extractedTasks ?? []).map((task) =>
        mapExtractedTaskDTOToAiTaskDTO(task, labels ?? []),
      ),
    [aiGeneratedMessage, labels],
  );
  const aiNotes = useMemo(() => aiGeneratedMessage?.extractedNotes ?? [], [aiGeneratedMessage]);

  useEffect(() => {
    setLocalTasks(aiTasks);
    setLocalNotes(aiNotes);
  }, [aiTasks, aiNotes]);

  useEffect(() => {
    void (async () => {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        console.warn("[Mic] Permission not granted");
        router.back();
      }
    })();
  }, []);

  const onDeleteTask = (taskId: string) => {
    setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const onDeleteNote = (noteId: string) => {
    setLocalNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const handleAddAll = async () => {
    if (isAdding || isNoteCreating) return;
    try {
      if (localTasks.length > 0) {
        const payloads = localTasks.map(convertAiTaskToAddTaskItemDTO);
        await Promise.all(payloads.map((payload) => addTaskAsync(payload)));
      }
      if (localNotes.length > 0) {
        await Promise.all(localNotes.map((n) => createNoteAsync(n.text)));
      }

      router.back();
      Toast.show({ type: "warning", text1: t("success.taskAdded") });
    } catch (error) {
      console.error("Add tasks/notes failed", error);
    }
  };

  const hasResults = localTasks.length > 0 || localNotes.length > 0;

  return (
    <View className="flex-1 bg-transparent">
      <Pressable className="absolute inset-0" onPress={() => router.back()} pointerEvents="auto" />
      <View style={{ flex: 1, justifyContent: "flex-end" }} pointerEvents="box-none">
        <LinearGradient
          colors={["#A3DC2F", "#2F80ED"]}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={{ height: height * 0.8, borderRadius: 20 }}
        >
          <View className="flex-1 items-center">
            {/* Top row - dismiss button */}
            <View className="w-full items-end px-6 pt-4 pb-2">
              <Pressable onPress={() => router.back()} accessibilityLabel="Stop">
                <MaterialCommunityIcons name="chevron-down" size={32} color="white" />
              </Pressable>
            </View>

            {/* Hint text (no results) */}
            {!hasResults && <VoiceHintText />}

            {/* Task / note cards (has results) */}
            {hasResults && (
              <Animated.ScrollView className="w-full flex-1" showsVerticalScrollIndicator={false}>
                {localTasks.map((task) => (
                  <AiResultCard
                    key={task.id}
                    id={task.id}
                    text={task.title}
                    onDelete={onDeleteTask}
                    label={task.label}
                    startTime={task.startTime}
                    endTime={task.endTime}
                  />
                ))}
                {localNotes.length > 0 && (
                  <>
                    <Text className="text-white/80 font-baloo text-base ml-7 mt-4 mb-2">Notes</Text>
                    {localNotes.map((note) => (
                      <AiResultCard
                        key={note.id}
                        id={note.id}
                        text={note.text}
                        onDelete={onDeleteNote}
                      />
                    ))}
                  </>
                )}
              </Animated.ScrollView>
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
            <View className="w-full flex-row items-center px-6 gap-4 pb-8">
              {/* Microphone hold-to-record */}
              <Pressable
                onLongPress={() => void startListening()}
                onPressOut={() => void stopAndUpload()}
                accessibilityLabel="Hold to record"
                className="w-14 h-14 rounded-full items-center justify-center"
                style={{
                  backgroundColor: isListening ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)",
                }}
              >
                <MaterialCommunityIcons name="microphone" size={28} color="white" />
              </Pressable>

              {/* Waveform */}
              <View className="flex-1 items-center justify-center">
                {isListening ? (
                  <LottieView
                    source={LOTTIE_ANIMATIONS.voiceWave}
                    loop
                    autoPlay
                    style={{ width: "100%", height: 40 }}
                    resizeMode="contain"
                  />
                ) : (
                  <View className="flex-row items-center gap-1">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <View
                        key={i}
                        className="rounded-full"
                        style={{ width: 3, height: 16, backgroundColor: "rgba(255,255,255,0.5)" }}
                      />
                    ))}
                  </View>
                )}
              </View>

              {/* Confirm button */}
              <Pressable
                onPress={() => void handleAddAll()}
                accessibilityLabel="Confirm"
                className="w-14 h-14 rounded-full items-center justify-center"
                style={{ backgroundColor: "rgba(255,255,255,0.25)" }}
              >
                <MaterialCommunityIcons name="check" size={28} color="white" />
              </Pressable>
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}
