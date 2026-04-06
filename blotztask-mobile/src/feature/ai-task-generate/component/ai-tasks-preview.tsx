/* eslint-disable camelcase */
import { AiTaskDTO } from "@/feature/ai-task-generate/models/ai-task-dto";
import React, { useEffect, useState } from "react";
import { View, Pressable, ActivityIndicator, ScrollView, Text } from "react-native";
import { AiResultCard } from "./ai-result-card";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { convertAiTaskToAddTaskItemDTO } from "@/feature/ai-task-generate/utils/map-aitask-to-addtaskitem-dto";
import { BottomSheetType } from "../models/bottom-sheet-type";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";
import { AiNoteDTO } from "../models/ai-note-dto";
import { theme } from "@/shared/constants/theme";
import { type AiTaskOutcome } from "@/shared/constants/posthog-events";
import { analytics } from "@/shared/services/analytics";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useNotesMutation } from "@/feature/notes/hooks/useNotesMutation";
import { Toast } from "react-native-toast-message/lib/src/Toast";

export function AiTasksPreview({
  aiTasks,
  aiNotes,
  setModalType,
  userInput,
  setAiGeneratedMessage,
}: {
  aiTasks?: AiTaskDTO[];
  aiNotes?: AiNoteDTO[];
  setModalType: (v: BottomSheetType) => void;
  userInput: string;
  setAiGeneratedMessage: (v?: AiResultMessageDTO) => void;
}) {
  const { t } = useTranslation("aiTaskGenerate");
  const [localTasks, setLocalTasks] = useState<AiTaskDTO[]>(aiTasks ?? []);
  const [localNotes, setLocalNotes] = useState<AiNoteDTO[]>(aiNotes ?? []);
  const { addTaskAsync, isAdding } = useTaskMutations();
  const { createNoteAsync, isNoteCreating } = useNotesMutation();

  useEffect(() => {
    analytics.trackUserUsedAiGeneration({
      userInput,
      generatedTaskCount: aiTasks?.length ?? 0,
      generatedNoteCount: aiNotes?.length ?? 0,
      generatedTaskTitles: aiTasks?.map((t) => t.title) ?? [],
      generatedNoteTexts: aiNotes?.map((n) => n.text) ?? [],
    });
  }, []);

  const captureOutcome = (outcome: AiTaskOutcome, addedTaskCount = 0, addedNoteCount = 0) => {
    analytics.trackIfUserAcceptAiTask({
      userInput,
      outcome,
      generatedTaskCount: aiTasks?.length ?? 0,
      generatedNoteCount: aiNotes?.length ?? 0,
      addedTaskCount,
      addedNoteCount,
    });
  };

  const hasItems = localTasks.length > 0 || localNotes.length > 0;
  const addAllDisabled = isAdding || isNoteCreating || !hasItems;

  const onDeleteNote = (noteId: string) => {
    setLocalNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const onNoteTextChange = (noteId: string, newText: string) => {
    setLocalNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, text: newText } : n)));
  };

  const onDeleteTask = (taskId: string) => {
    setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const onTitleChange = (taskId: string, newTitle: string) => {
    setLocalTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, title: newTitle } : t)));
  };

  const handleAddAll = async () => {
    if (isAdding || isNoteCreating || !hasItems) return;

    try {
      // tasks
      if (localTasks.length > 0) {
        const payloads = localTasks.map(convertAiTaskToAddTaskItemDTO);
        await Promise.all(payloads.map((payload) => addTaskAsync(payload)));
        // query invalidation is already handled by the mutation's onSuccess
      }

      // notes
      if (localNotes.length > 0) {
        await Promise.all(localNotes.map((n) => createNoteAsync(n.text)));
        // invalidation handled by mutation
      }

      captureOutcome("accepted", localTasks.length, localNotes.length);
      setLocalTasks([]);
      setLocalNotes([]);
      router.back();
      Toast.show({ type: "warning", text1: t("success.taskAdded") });
    } catch (error) {
      console.error("Add tasks/notes failed", error);
    }
  };

  const handleGoBack = () => {
    setAiGeneratedMessage();
    setModalType("input");

    captureOutcome("go_back");
  };

  return (
    <View className="items-center max-h-[600px]">
      <ScrollView className="w-full mt-4 mb-8">
        {localTasks.length > 0 && (
          <>
            {localTasks.map((task) => (
              <AiResultCard
                key={task.id}
                id={task.id}
                text={task.title}
                onDelete={onDeleteTask}
                label={task.label}
                startTime={task.startTime}
                endTime={task.endTime}
                onTextChange={onTitleChange}
              />
            ))}
          </>
        )}
        {localNotes.length > 0 && (
          <>
            <Text className="font-baloo text-base text-primary ml-7 mt-4 mb-2">
              {t("labels.notesSection")}
            </Text>
            {localNotes.map((note) => (
              <AiResultCard
                key={note.id}
                id={note.id}
                text={note.text}
                onDelete={onDeleteNote}
                onTextChange={onNoteTextChange}
              />
            ))}
          </>
        )}
      </ScrollView>

      <View className="flex-row justify-center items-center mt-4 mb-10 flex-wrap gap-2">
        <Pressable
          onPress={handleGoBack}
          className="w-12 h-12 rounded-full items-center justify-center bg-background mx-2 font-bold"
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={t("buttons.goBack")}
        >
          <MaterialCommunityIcons name="arrow-u-left-top" size={20} color={theme.colors.primary} />
        </Pressable>

        <Pressable
          onPress={handleAddAll}
          disabled={addAllDisabled}
          className={`w-[100px] h-12 rounded-full items-center justify-center mx-2 ${
            addAllDisabled ? "bg-gray-300" : "bg-[#a6d445]"
          }`}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={t("buttons.addAll")}
        >
          {isAdding || isNoteCreating ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text className="font-baloo text-sm">{t("buttons.addAll")}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
