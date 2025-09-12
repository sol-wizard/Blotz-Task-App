import React, { useState, useEffect } from "react";
import { View, Pressable } from "react-native";
import { Text, ProgressBar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { TaskDetailTag } from "./task-detail-tag";
import { COLORS } from "@/shared/constants/colors";
import SubtaskItem from "./subtask-item";
import { router } from "expo-router";
import { fetchSubtasksForTask, fetchTotalHoursForTask } from "../../services/subtask-service";

type Props = { task?: TaskDetailDTO };
const COLOR = COLORS.primary;

export default function SubtaskDetail({ task }: Props) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalLabel, setTotalLabel] = useState("");
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!task?.id) {
        setList([]);
        setTotalLabel("");
        return;
      }
      setLoading(true);
      const items = await fetchSubtasksForTask(task.id);
      if (cancelled) return;
      setList(items ?? []);

      const { label } = await fetchTotalHoursForTask(task.id, items ?? []);
      if (cancelled) return;
      setTotalLabel(label);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [task?.id]);

  // Progress
  const completed = list.filter((s) => s?.isDone).length;
  const total = list.length || 1;
  const progress = completed / total;

  // Local toggle (TODO: later connect to "update subtask" interface)
  const toggle = (id: number) => {
    setList((prev) => prev.map((s) => (s.id === id ? { ...s, isDone: !s.isDone } : s)));
  };

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
        <Text style={{ color: COLOR, fontWeight: "800" }} className="text-sm">
          {totalLabel}
        </Text>
      </View>

      <View className="flex-row items-center mb-3 gap-2 mt-1">
        <TaskDetailTag>Work</TaskDetailTag>
        <TaskDetailTag>{task?.isDone ? "Done" : "In progress"}</TaskDetailTag>
      </View>

      <View className="mb-2">
        <Text className="text-[12px] text-neutral-500 font-bold mb-1">
          {completed}/{total} Completed
        </Text>
        <ProgressBar progress={progress} color={COLOR} />
      </View>

      <View style={{ height: 1, backgroundColor: COLOR }} className="my-3" />

      <View>
        {loading && list.length === 0 ? (
          <Text className="text-[13px] text-neutral-500">Loading subtasks…</Text>
        ) : (
          list.map((s) => <SubtaskItem key={s.id} item={s} onToggle={toggle} />)
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
