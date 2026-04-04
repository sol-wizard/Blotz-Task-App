import React, { useState, useEffect } from "react";
import { View, Text, Pressable, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { LOTTIE_ANIMATIONS } from "@/shared/constants/assets";
import { AiTaskDTO } from "../models/ai-task-dto";
import { AiNoteDTO } from "../models/ai-note-dto";
import { AiTaskCard } from "./ai-task-card";
import { AiNoteCard } from "./ai-note-card";
import { VoiceHintText } from "./voice-hint-text";
import { useTranslation } from "react-i18next";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { convertAiTaskToAddTaskItemDTO } from "../utils/map-aitask-to-addtaskitem-dto";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useNotesMutation } from "@/feature/notes/hooks/useNotesMutation";
import { router } from "expo-router";
import Toast from "react-native-toast-message";

export const AiVoiceInput = ({
  transcribeAudio,
  aiTasks = [],
  aiNotes = [],
  isAiGenerating = false,
}: {
  transcribeAudio: (uri: string) => Promise<void>;
  aiTasks?: AiTaskDTO[];
  aiNotes?: AiNoteDTO[];
  isAiGenerating?: boolean;
}) => {
  const { t } = useTranslation("aiTaskGenerate");
  const { height } = useWindowDimensions();
  const { isListening, startListening, stopAndUpload } = useVoiceRecorder(transcribeAudio);
  const { addTaskAsync, isAdding } = useTaskMutations();
  const { createNoteAsync, isNoteCreating } = useNotesMutation();

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

  const [localTasks, setLocalTasks] = useState<AiTaskDTO[]>(aiTasks);
  const [localNotes, setLocalNotes] = useState<AiNoteDTO[]>(aiNotes);

  useEffect(() => {
    setLocalTasks(aiTasks);
    setLocalNotes(aiNotes);
  }, [aiTasks, aiNotes]);

  const onDeleteTask = (taskId: string) => {
    setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const onDeleteNote = (noteId: string) => {
    setLocalNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const hasResults = localTasks.length > 0 || localNotes.length > 0;

  return (
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
              <AiTaskCard key={task.id} task={task} handleTaskDelete={onDeleteTask} />
            ))}
            {localNotes.length > 0 && (
              <>
                <Text className="text-white/80 font-baloo text-base ml-7 mt-4 mb-2">Notes</Text>
                {localNotes.map((note) => (
                  <AiNoteCard key={note.id} note={note} handleNoteDelete={onDeleteNote} />
                ))}
              </>
            )}
          </Animated.ScrollView>
        )}

        {/* Listening indicator — always occupies space to prevent layout shift */}
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

          {/* Confirm button — adds all tasks */}
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
  );
};
