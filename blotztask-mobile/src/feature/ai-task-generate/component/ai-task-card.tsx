import React, { useState } from "react";
import { View, Text, Pressable, Keyboard } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AiTaskDTO } from "@/feature/ai-task-generate/models/ai-task-dto";
import { theme } from "@/shared/constants/theme";
import { formatAiTaskCardDate, formatAiTaskCardTime } from "../utils/format-ai-task-card-time";
import { BottomSheetModal, BottomSheetTextInput } from "@gorhom/bottom-sheet";

type Props = {
  task: AiTaskDTO;
  handleTaskDelete: (taskId: string) => void;
  onTitleChange?: (taskId: string, newTitle: string) => void;
  sheetRef: React.RefObject<BottomSheetModal | null>;
};

export function AiTaskCard({ task, handleTaskDelete, onTitleChange, sheetRef }: Props) {
  const [draftTitle, setDraftTitle] = useState(task.title);

  const handleEdit = () => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== task.title) {
      onTitleChange?.(task.id, trimmed);
    } else if (!trimmed) {
      setDraftTitle(task.title);
    }

    Keyboard.dismiss();
    sheetRef.current?.collapse();
  };
  const formatTime = formatAiTaskCardTime({ startTime: task.startTime, endTime: task.endTime });
  const formatDate = formatAiTaskCardDate({ startTime: task.startTime, endTime: task.endTime });

  return (
    <View className="bg-white rounded-2xl flex-row items-center shadow-md w-[88%] h-20 justify-between pr-3 ml-7 mt-4 mb-4 py-4 pl-6 mx-4">
      <View
        className="w-2 h-full rounded-full"
        style={{ backgroundColor: theme.colors.disabled }}
      />

      <View className="flex-1 flex-row items-center justify-between ml-4">
        <BottomSheetTextInput
          value={draftTitle}
          onChangeText={setDraftTitle}
          onBlur={handleEdit}
          onSubmitEditing={handleEdit}
          returnKeyType="done"
          className="mr-3 text-lg font-semibold leading-5"
          style={{ color: theme.colors.onSurface }}
          placeholder="Task title"
          placeholderTextColor={theme.colors.disabled}
          accessibilityLabel="Edit task title"
          accessibilityHint="Double tap to edit task title"
          autoFocus={false}
        />

        {task.startTime || task.endTime ? (
          <View className="items-center ml-2">
            {formatTime && (
              <Text className="text-sm font-medium ml-1 text-tertiary">{formatTime}</Text>
            )}
            {formatDate && (
              <Text className="text-sm font-medium ml-1 text-tertiary">{formatDate}</Text>
            )}
          </View>
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
