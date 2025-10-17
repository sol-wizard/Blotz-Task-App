import React, { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { AiTaskDTO } from "@/feature/ai-task-generate/models/ai-task-dto";
import { theme } from "@/shared/constants/theme";
import { format, parseISO } from "date-fns";

type Props = {
  task: AiTaskDTO;
  handleTaskDelete: (taskId: string) => void;
  onTitleChange?: (taskId: string, newTitle: string) => void;
};

export function AiTaskCard({ task, handleTaskDelete, onTitleChange }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const textInputRef = useRef<TextInput>(null);

  const dividerColor = theme.colors.disabled;

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => textInputRef.current?.focus(), 50);
    }
  }, [isEditing]);

  const handleEdit = () => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== task.title) {
      onTitleChange?.(task.id, trimmed);
    } else if (!trimmed) {
      setDraftTitle(task.title);
    }
    setIsEditing(false);
  };

  const handleStartEditing = () => {
    setIsEditing(true);
  };

  return (
    <View className="bg-white rounded-2xl flex-row items-center shadow-md w-[88%] h-20 justify-between pr-3 ml-7 mt-4 mb-4 py-4 pl-6 mx-4">
      <View className="w-2 h-full rounded-full" style={{ backgroundColor: dividerColor }} />

      <View className="flex-1 flex-row items-center justify-between ml-4">
        <TextInput
          ref={textInputRef}
          value={draftTitle}
          onChangeText={setDraftTitle}
          onBlur={handleEdit}
          onSubmitEditing={handleEdit}
          editable={isEditing}
          returnKeyType="done"
          className="font-semibold"
          onPressIn={() => {
            if (!isEditing) {
              handleStartEditing();
            }
          }}
          style={{
            flex: 1,
            color: theme.colors.onSurface,
            paddingVertical: 0,
            textAlignVertical: "center",
          }}
          placeholder="Task title"
          placeholderTextColor={theme.colors.disabled}
          accessibilityLabel="Task title"
        />

        {task.startTime || task.endTime ? (
          <View className="flex-row items-center ml-2">
            <MaterialIcons name="schedule" size={16} color={theme.colors.primary} />
            <Text className="text-sm font-medium ml-1" style={{ color: theme.colors.primary }}>
              {task.startTime && task.endTime
                ? `${format(parseISO(task.startTime), "HH:mm")} - ${format(parseISO(task.endTime), "HH:mm")}`
                : task.startTime
                  ? format(parseISO(task.startTime), "HH:mm")
                  : format(parseISO(task.endTime), "HH:mm")}
            </Text>
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
