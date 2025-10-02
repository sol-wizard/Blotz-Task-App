import React from "react";
import { Text, View, Pressable } from "react-native";
import { ProgressBar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";

import SubtaskItem from "./subtask-item";
import { router } from "expo-router";
import { theme } from "@/shared/constants/theme";
import TaskDetailTag from "./task-detail-tag";

type Props = {
  task?: TaskDetailDTO;
  subtasks: any[];
  totalTaskTime: string;
  onToggleSubtask: (id: number) => void;
};

export default function SubtaskDetail({ task, subtasks, totalTaskTime, onToggleSubtask }: Props) {
  // const [subtaskList, setSubtaskList] = useState<any[]>([]);
  // const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  // TODO: this is a temporary method to change subtask isDone state and will be replaced after implementing the update subtask function
  const completed = subtasks.filter((s) => s?.isDone).length;
  const total = subtasks.length || 1;
  const progress = completed / total;

  const handleEditWithAI = () => {
    if (!task?.id) return;
    router.push({ pathname: "/(protected)/ai-breakdown", params: { id: String(task.id) } });
  };

  return (
    <View
      className="flex-1 bg-white px-4 pt-3"
      style={{ paddingBottom: (insets.bottom ?? 0) + 16 }}
    >
      {/* Header */}
      <View className="flex-row items-start justify-between mb-2">
        <Text
          className="flex-1 text-gray-900 mr-3 text-[22px] leading-7"
          style={{ fontWeight: "800" }}
        >
          {task?.title ?? "Subtasks"}
        </Text>
        <Text className="text-sm font-extrabold text-tertiary">{totalTaskTime}</Text>
      </View>
      <View className="flex-row items-center mb-3 gap-2 mt-1">
        <TaskDetailTag>Work</TaskDetailTag>
        <TaskDetailTag>{task?.isDone ? "Done" : "In progress"}</TaskDetailTag>
      </View>
      <View className="mb-2">
        <Text className="text-[12px] text-neutral-500 font-bold mb-1">
          {completed}/{total} Completed
        </Text>
        <ProgressBar progress={progress} color={theme.colors.primary} />
      </View>
      <View className="my-3 h-px bg-tertiary" />
      <View>
        {subtasks.length === 0 ? (
          <Text className="text-[13px] text-neutral-500">No subtasks</Text>
        ) : (
          subtasks.map((s) => (
            <SubtaskItem key={s.id} item={s} onToggle={() => onToggleSubtask(s.id)} />
          ))
        )}
      </View>
      <View className="mt-6">
        <Pressable
          onPress={handleEditWithAI}
          className="w-full items-center justify-center py-4 rounded-2xl bg-neutral-300"
        >
          <Text className="text-base text-white" style={{ fontWeight: "800" }}>
            Edit with AI
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
