import React, { useState } from "react";
import { View, Text, Pressable, Keyboard, TextInput } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AiTaskDTO } from "@/feature/ai-task-generate/models/ai-task-dto";
import { theme } from "@/shared/constants/theme";
import { formatAiTaskCardDate, formatAiTaskCardTime } from "../utils/format-ai-task-card-time";
import { useTranslation } from "react-i18next";

type Props = {
  task: AiTaskDTO;
  handleTaskDelete: (taskId: string) => void;
  onTitleChange?: (taskId: string, newTitle: string) => void;
};

export function AiTaskCard({ task, handleTaskDelete, onTitleChange }: Props) {
  const { t } = useTranslation("aiTaskGenerate");
  const [draftTitle, setDraftTitle] = useState(task.title);

  const handleEdit = () => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== task.title) {
      onTitleChange?.(task.id, trimmed);
    } else if (!trimmed) {
      setDraftTitle(task.title);
    }

    Keyboard.dismiss();
  };
  const formatTime = formatAiTaskCardTime({ startTime: task.startTime, endTime: task.endTime });
  const formatDate = formatAiTaskCardDate({ startTime: task.startTime, endTime: task.endTime });

  return (
    <View className="bg-white rounded-2xl flex-row items-center shadow-md w-[88%] min-h-20 justify-between pr-3 ml-7 mt-4 mb-4 py-4 pl-6 mx-4">
      <View
        className="w-2 h-full rounded-full"
        style={{ backgroundColor: task.label?.color ?? theme.colors.disabled }}
      />

      <View className="flex-1 flex-row items-center ml-4">
        <TextInput
          value={draftTitle}
          onChangeText={setDraftTitle}
          onBlur={handleEdit}
          onSubmitEditing={handleEdit}
          returnKeyType="done"
          multiline
          className="flex-1 mr-3 text-lg font-baloo leading-5"
          style={{ color: theme.colors.onSurface }}
          placeholder={t("taskCard.titlePlaceholder")}
          placeholderTextColor={theme.colors.disabled}
          accessibilityLabel={t("taskCard.editTitleLabel")}
          accessibilityHint={t("taskCard.editTitleHint")}
          autoFocus={false}
        />

        {task.startTime || task.endTime ? (
          <View className="items-center ml-2 flex-shrink-0">
            {formatTime && (
              <Text className="text-sm font-balooThin ml-1 text-primary">{formatTime}</Text>
            )}
            {formatDate && (
              <Text className="text-sm font-balooThin ml-1 text-primary">{formatDate}</Text>
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
