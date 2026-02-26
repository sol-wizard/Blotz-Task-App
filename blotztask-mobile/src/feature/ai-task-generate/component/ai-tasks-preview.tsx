/* eslint-disable camelcase */
import { AiTaskDTO } from "@/feature/ai-task-generate/models/ai-task-dto";
import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, ActivityIndicator, ScrollView, Text, Alert } from "react-native";
import { AiTaskCard } from "./ai-task-card";
import { AiNoteCard } from "./ai-note-card";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { convertAiTaskToAddTaskItemDTO } from "@/feature/ai-task-generate/utils/map-aitask-to-addtaskitem-dto";
import { BottomSheetType } from "../models/bottom-sheet-type";
import { usePostHog } from "posthog-react-native";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";
import { AiNoteDTO } from "../models/ai-note-dto";
import { theme } from "@/shared/constants/theme";
import { EVENTS } from "@/shared/constants/posthog-events";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { createNote } from "@/feature/notes/services/notes-service";
import { noteKeys } from "@/shared/constants/query-key-factory";
import { addTaskItem } from "@/shared/services/task-service";
import { taskKeys } from "@/shared/constants/query-key-factory";

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
  setAiGeneratedMessage: React.Dispatch<React.SetStateAction<AiResultMessageDTO | undefined>>;
}) {
  const { t } = useTranslation("aiTaskGenerate");
  const queryClient = useQueryClient();
  const [localTasks, setLocalTasks] = useState<AiTaskDTO[]>(aiTasks ?? []);
  const [localNotes, setLocalNotes] = useState<AiNoteDTO[]>(aiNotes ?? []);
  const [isAdding, setIsAdding] = useState(false);

  const posthog = usePostHog();

  const finishedAllStepsRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (!finishedAllStepsRef.current) {
        posthog.capture(EVENTS.CREATE_TASK_BY_AI, {
          ai_output: JSON.stringify({ tasks: localTasks, notes: localNotes }),
          user_input: userInput,
          outcome: "abandoned",
          ai_generated_task_count: localTasks.length,
          ai_generated_note_count: localNotes.length,
          user_add_task_count: 0,
          user_add_note_count: 0,
        });
      }
    };
  }, [localTasks, localNotes]);

  const hasItems = localTasks.length > 0 || localNotes.length > 0;
  const addAllDisabled = isAdding || !hasItems;

  const onDeleteNote = (noteId: string) => {
    setLocalNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const onNoteTextChange = (noteId: string, newText: string) => {
    setLocalNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, text: newText } : n)));
  };

  const onDeleteTask = (taskId: string) => {
    setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const onTitleChange = (taskIndex: number, newTitle: string) => {
    setLocalTasks((prev) =>
      prev.map((t, index) => (index === taskIndex ? { ...t, title: newTitle } : t)),
    );

    setAiGeneratedMessage((prev) => {
      if (!prev) return prev;

      const extractedTasks = (prev.extractedTasks ?? []).map((t, index) =>
        index === taskIndex ? { ...t, title: newTitle } : t,
      );

      return { ...prev, extractedTasks };
    });
  };

  const handleAddAll = async () => {
    if (isAdding || !hasItems) return;

    try {
      const hasEmptyTitle = localTasks.some((t) => t.title.trim() === "");
      if (hasEmptyTitle) {
        Alert.alert(t("validation.emptyTitle.title"), t("validation.emptyTitle.message"));
        return;
      }

      const trimmedTasks = localTasks.map((t) => ({ ...t, title: t.title.trim() }));
      const payloads = trimmedTasks.map(convertAiTaskToAddTaskItemDTO);
      setIsAdding(true);

      if (trimmedTasks.length > 0) {
        await Promise.all(payloads.map((payload) => addTaskItem(payload)));
        queryClient.invalidateQueries({ queryKey: taskKeys.all });
      }

      if (localNotes.length > 0) {
        await Promise.all(localNotes.map((n) => createNote(n.text)));
        queryClient.invalidateQueries({ queryKey: noteKeys.all });
      }

      finishedAllStepsRef.current = true;

      posthog.capture(EVENTS.CREATE_TASK_BY_AI, {
        ai_output: JSON.stringify({ tasks: localTasks, notes: localNotes }),
        user_input: userInput,
        ai_generated_task_count: localTasks.length,
        ai_generated_note_count: localNotes.length,
        user_add_task_count: localTasks.length,
        user_add_note_count: localNotes.length,
        outcome: "accepted",
      });

      setLocalTasks([]);
      setLocalNotes([]);
      router.back();
    } catch (error) {
      console.log("Add tasks/notes failed", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleGoBack = () => {
    setAiGeneratedMessage(undefined);
    setModalType("input");

    posthog.capture(EVENTS.CREATE_TASK_BY_AI, {
      ai_output: JSON.stringify({ tasks: localTasks, notes: localNotes }),
      user_input: userInput,
      ai_generated_task_count: localTasks.length,
      ai_generated_note_count: localNotes.length,
      outcome: "go_back",
      user_add_task_count: 0,
      user_add_note_count: 0,
    });
  };

  return (
    <View className="items-center max-h-[600px]">
      <ScrollView className="w-full mt-4 mb-8">
        {localTasks.length > 0 && (
          <>
            {localTasks.map((task,index) => (
              <AiTaskCard
                key={task.id}
                task={task}
                handleTaskDelete={onDeleteTask}
                onTitleChange={(_taskId, newTitle) => onTitleChange(index, newTitle)}
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
              <AiNoteCard
                key={note.id}
                note={note}
                handleNoteDelete={onDeleteNote}
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
          {isAdding ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text className="font-baloo text-sm">{t("buttons.addAll")}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
