/* eslint-disable camelcase */
import { AiTaskDTO } from "@/feature/ai-task-generate/models/ai-task-dto";
import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { AiTaskCard } from "./ai-task-card";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { convertAiTaskToAddTaskItemDTO } from "@/feature/ai-task-generate/utils/map-aitask-to-addtaskitem-dto";
import { BottomSheetType } from "../models/bottom-sheet-type";
import { ScrollView } from "react-native-gesture-handler";
import { usePostHog } from "posthog-react-native";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";
import { mapExtractedTaskDTOToAiTaskDTO } from "../utils/map-extracted-to-task-dto";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useAllLabels } from "@/shared/hooks/useAllLabels";

export function AiTasksPreview({
  aiMessage,
  setModalType,
  isVoiceInput,
  userInput,
  sheetRef,
}: {
  aiMessage?: AiResultMessageDTO;
  setModalType: (v: BottomSheetType) => void;
  isVoiceInput: boolean;
  userInput: string;
  sheetRef: React.RefObject<BottomSheetModal | null>;
}) {
  const { labels } = useAllLabels();
  const { addTask, isAdding } = useTaskMutations();
  const aiGeneratedTasks = aiMessage?.extractedTasks.map((task) =>
    mapExtractedTaskDTOToAiTaskDTO(task, labels ?? []),
  );

  const [localTasks, setLocalTasks] = useState<AiTaskDTO[]>(aiGeneratedTasks ?? []);
  const posthog = usePostHog();

  const finishedAllStepsRef = useRef<boolean>(false);

  const createDisabled = isAdding || localTasks.length === 0;

  const onDeleteTask = (taskId: string) => {
    setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const onTitleChange = (taskId: string, newTitle: string) => {
    setLocalTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, title: newTitle } : t)));
  };

  const handleAddTasks = async () => {
    if (isAdding || !localTasks.length) return;

    try {
      const payloads = localTasks.map(convertAiTaskToAddTaskItemDTO);
      await Promise.all(payloads.map((payload) => addTask(payload)));
      finishedAllStepsRef.current = true;

      posthog.capture("ai_task_interaction_completed", {
        ai_output: JSON.stringify(aiMessage),
        user_input: userInput,
        ai_generate_task_count: aiGeneratedTasks?.length ?? 0,
        user_add_task_count: payloads.length ?? 0,
        outcome: "accepted",
        is_voice_input: isVoiceInput,
      });

      setModalType("add-task-success");
      setLocalTasks([]);
    } catch (error) {
      console.log("Add tasks failed", error);
    }
  };

  const handleGoBack = () => {
    setModalType("input");

    posthog.capture("ai_task_interaction_completed", {
      ai_output: JSON.stringify(aiMessage),
      user_input: userInput,
      ai_generate_task_count: aiGeneratedTasks?.length ?? 0,
      outcome: "go_back",
      user_add_task_count: 0,
      is_voice_input: isVoiceInput,
    });
  };

  useEffect(() => {
    return () => {
      if (!finishedAllStepsRef.current) {
        posthog.capture("ai_task_interaction_completed", {
          ai_output: JSON.stringify(aiMessage),
          user_input: userInput,
          outcome: "abandoned",
          is_voice_input: isVoiceInput,
          ai_generated_task_count: aiGeneratedTasks?.length ?? 0,
          user_add_task_count: 0,
        });
      }
    };
  }, [aiGeneratedTasks?.length, aiMessage, isVoiceInput, posthog, userInput]);

  return (
    <View className="mb-10 items-center justify-between">
      <ScrollView className="pb-5 w-full min-h-20 max-h-200">
        {localTasks.map((task) => (
          <AiTaskCard
            key={task.id}
            task={task}
            handleTaskDelete={onDeleteTask}
            onTitleChange={onTitleChange}
            sheetRef={sheetRef}
          />
        ))}
      </ScrollView>

      <View className="flex-row justify-center items-center mb-4">
        <Pressable
          onPress={handleGoBack}
          className="w-12 h-12 rounded-full items-center justify-center bg-black mx-8 font-bold"
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="arrow-u-left-top" size={20} color="white" />
        </Pressable>

        <Pressable
          onPress={handleAddTasks}
          disabled={createDisabled}
          className={`w-12 h-12 rounded-full items-center justify-center mx-8 ${
            createDisabled ? "bg-gray-300" : "bg-black"
          }`}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Add all remaining AI tasks"
        >
          {isAdding ? (
            <ActivityIndicator size="small" />
          ) : (
            <Ionicons name="arrow-up" size={20} color="white" />
          )}
        </Pressable>
      </View>
    </View>
  );
}
