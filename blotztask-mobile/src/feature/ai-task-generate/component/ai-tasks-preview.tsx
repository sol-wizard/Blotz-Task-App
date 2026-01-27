/* eslint-disable camelcase */
import { AiTaskDTO } from "@/feature/ai-task-generate/models/ai-task-dto";
import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, ActivityIndicator, ScrollView, Text } from "react-native";
import { AiTaskCard } from "./ai-task-card";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { convertAiTaskToAddTaskItemDTO } from "@/feature/ai-task-generate/utils/map-aitask-to-addtaskitem-dto";
import { BottomSheetType } from "../models/bottom-sheet-type";
import { usePostHog } from "posthog-react-native";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";
import { theme } from "@/shared/constants/theme";
import { EVENTS } from "@/shared/constants/posthog-events";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

export function AiTasksPreview({
  aiTasks,
  setModalType,
  userInput,
  setAiGeneratedMessage,
}: {
  aiTasks?: AiTaskDTO[];
  setModalType: (v: BottomSheetType) => void;
  userInput: string;
  setAiGeneratedMessage: (v?: AiResultMessageDTO) => void;
}) {
  const { t } = useTranslation("aiTaskGenerate");
  const { addTask, isAdding } = useTaskMutations();
  const [localTasks, setLocalTasks] = useState<AiTaskDTO[]>(aiTasks ?? []);

  const posthog = usePostHog();

  const finishedAllStepsRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (!finishedAllStepsRef.current) {
        posthog.capture(EVENTS.CREATE_TASK_BY_AI, {
          ai_output: JSON.stringify(localTasks),
          user_input: userInput,
          outcome: "abandoned",
          ai_generated_task_count: localTasks?.length ?? 0,
          user_add_task_count: 0,
        });
      }
    };
  }, [localTasks]);

  const createDisabled = isAdding || localTasks?.length === 0;

  const onDeleteTask = (taskId: string) => {
    setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const onTitleChange = (taskId: string, newTitle: string) => {
    setLocalTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, title: newTitle } : t)));
  };

  const handleAddTasks = async () => {
    if (isAdding || !localTasks?.length) return;

    try {
      const payloads = localTasks.map(convertAiTaskToAddTaskItemDTO);

      await Promise.all(payloads.map((payload) => addTask(payload)));

      finishedAllStepsRef.current = true;

      posthog.capture(EVENTS.CREATE_TASK_BY_AI, {
        ai_output: JSON.stringify(localTasks),
        user_input: userInput,
        ai_generate_task_count: localTasks?.length ?? 0,
        user_add_task_count: payloads.length ?? 0,
        outcome: "accepted",
      });

      setLocalTasks([]);
      router.back();
    } catch (error) {
      console.log("Add tasks failed", error);
    }
  };

  const handleGoBack = () => {
    setAiGeneratedMessage();
    setModalType("input");

    posthog.capture(EVENTS.CREATE_TASK_BY_AI, {
      ai_output: JSON.stringify(localTasks),
      user_input: userInput,
      ai_generate_task_count: localTasks?.length ?? 0,
      outcome: "go_back",
      user_add_task_count: 0,
    });
  };

  return (
    <View className="items-center max-h-[600px]">
      <ScrollView className="w-full mt-4 mb-8">
        {localTasks?.map((task) => (
          <AiTaskCard
            key={task.id}
            task={task}
            handleTaskDelete={onDeleteTask}
            onTitleChange={onTitleChange}
          />
        ))}
      </ScrollView>

      <View className="flex-row justify-center items-center mt-4 mb-10">
        <Pressable
          onPress={handleGoBack}
          className="w-12 h-12 rounded-full items-center justify-center bg-background mx-8 font-bold"
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={t("buttons.goBack")}
        >
          <MaterialCommunityIcons name="arrow-u-left-top" size={20} color={theme.colors.primary} />
        </Pressable>

        <Pressable
          onPress={handleAddTasks}
          disabled={createDisabled}
          className={`w-[100px] h-12 rounded-full items-center justify-center mx-8 ${
            createDisabled ? "bg-gray-300" : "bg-[#a6d445]"
          }`}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={t("buttons.addToTasks")}
        >
          {isAdding ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text className="font-baloo text-sm">{t("buttons.addToTasks")}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
