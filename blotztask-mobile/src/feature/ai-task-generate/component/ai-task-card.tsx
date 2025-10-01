import React, { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { format, parseISO } from "date-fns";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AiTaskDTO } from "@/feature/ai-chat-hub/models/ai-task-dto";

type Props = {
  task: AiTaskDTO;
  handleTaskDelete: (taskId: string) => void;
  onTitleChange?: (taskId: string, newTitle: string) => void;
};

export function AiTaskCard({ task, handleTaskDelete, onTitleChange }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);

  const commitEdit = () => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== task.title) {
      onTitleChange?.(task.id, trimmed);
    }
    setIsEditing(false);
  };

  return (
    <View className="bg-white rounded-lg flex-row items-center shadow w-80 h-20 justify-between pr-3 mt-3 mb-6 py-4 pl-6 mx-4">
      <View className="w-2 h-full rounded-full bg-slate-300" />

      <View className="flex-1 flex-row items-center justify-between ml-4">
        {isEditing ? (
          <TextInput
            value={draftTitle}
            onChangeText={setDraftTitle}
            onBlur={commitEdit}
            onSubmitEditing={commitEdit}
            autoFocus
            returnKeyType="done"
            className="flex-1 mr-3 text-lg font-extrabold text-[#2F3640]"
            placeholder="Task title"
            placeholderTextColor="#9CA3AF"
          />
        ) : (
          <Pressable className="flex-1 mr-3" onPress={() => setIsEditing(true)}>
            <Text numberOfLines={1} className="text-lg font-extrabold text-[#2F3640]">
              {task.title}
            </Text>
          </Pressable>
        )}

        {task.startTime || task.endTime ? (
          <Text className="text-base font-semibold text-neutral-400">
            {formatTimeRange(task.startTime, task.endTime)}
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={() => handleTaskDelete(task.id)}
        hitSlop={10}
        className="justify-center w-8 h-8 rounded-full ml-3"
        android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: false }}
      >
        <MaterialCommunityIcons name={"close"} size={20} color="#2F3640" />
      </Pressable>
    </View>
  );
}

function formatTime(iso?: string) {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "HH:mm");
  } catch {
    return "";
  }
}

function formatTimeRange(start?: string, end?: string) {
  const s = formatTime(start);
  const e = formatTime(end);
  if (s && e) return `${s} - ${e}`;
  return s || e || "";
}
