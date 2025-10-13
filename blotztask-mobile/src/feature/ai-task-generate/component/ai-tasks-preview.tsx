import { AiTaskDTO } from "@/feature/ai-task-generate/models/ai-task-dto";
import React, { useEffect, useRef, useState } from "react";
import { View, Pressable } from "react-native";
import { AiTaskCard } from "./ai-task-card";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSelectedDayTaskStore } from "@/shared/stores/selectedday-task-store";
import { convertAiTaskToAddTaskItemDTO } from "@/feature/ai-task-generate/utils/map-aitask-to-addtaskitem-dto";
import { BottomSheetType } from "../models/bottom-sheet-type";
import { ScrollView } from "react-native-gesture-handler";
import { GradientCircle } from "@/shared/components/common/gradient-circle";
import { usePostHog } from "posthog-react-native";

export function AiTasksPreview({
  tasks,
  setModalType,
  isVoiceInput,
}: {
  tasks?: AiTaskDTO[];
  setModalType: (v: BottomSheetType) => void;
  isVoiceInput: boolean;
}) {
  const { addTask } = useSelectedDayTaskStore();
  const [localTasks, setLocalTasks] = useState<AiTaskDTO[]>(tasks ?? []);
  const posthog = usePostHog();
  const isVoiceInputRef = useRef(isVoiceInput);
  const finishedRef = useRef<boolean>(false);

  useEffect(() => {
    isVoiceInputRef.current = isVoiceInput;
  }, [isVoiceInput]);

  const onDeleteTask = (taskId: string) => {
    setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const onTitleChange = (taskId: string, newTitle: string) => {
    setLocalTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, title: newTitle } : t)));
  };

  const handleAddTasks = async () => {
    if (!localTasks.length) return;

    try {
      const payloads = localTasks.map(convertAiTaskToAddTaskItemDTO);
      await Promise.all(payloads.map(addTask));
      finishedRef.current = true;

      posthog.capture("ai_task_interaction_completed", {
        ai_generate_task_count: tasks?.length ?? 0,
        outcome: "accepted",
        user_add_task_count: payloads.length ?? 0,
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
      ai_generate_task_count: tasks?.length ?? 0,
      outcome: "go_back",
      user_add_task_count: 0,
      is_voice_input: isVoiceInput,
    });
  };

  useEffect(() => {
    return () => {
      if (!finishedRef.current) {
        posthog.capture("ai_task_interaction_completed", {
          outcome: "abandoned",
          is_voice_input: isVoiceInput,
          ai_generated_task_count: tasks?.length ?? 0,
          user_add_task_count: 0,
        });
      }
    };
  }, []);

  return (
    <View className="mb-10 items-center justify-between">
      <ScrollView className="pb-5 w-full min-h-20 max-h-80">
        {localTasks.map((task) => (
          <AiTaskCard
            key={task.id}
            task={task}
            handleTaskDelete={onDeleteTask}
            onTitleChange={onTitleChange}
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
        {!isVoiceInputRef.current && (
          <Pressable
            onPress={handleGoBack}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Edit"
            className="mx-4"
          >
            <GradientCircle size={70}>
              <MaterialCommunityIcons name="pencil-outline" size={35} color="white" />
            </GradientCircle>
          </Pressable>
        )}
        <Pressable
          onPress={handleAddTasks}
          disabled={localTasks.length === 0}
          className={`w-12 h-12 rounded-full items-center justify-center mx-8 ${localTasks.length ? "bg-black" : "bg-gray-300"}`}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Add all remaining AI tasks"
        >
          <Ionicons name="arrow-up" size={20} color="white" />
        </Pressable>
      </View>
    </View>
  );
}
