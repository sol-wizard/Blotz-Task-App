import { View, Text, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { theme } from "@/shared/constants/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { useSubtaskMutations } from "../hooks/useSubtaskMutations";
import { useSubtasksByParentId } from "@/feature/task-details/hooks/useSubtasksByParentId";
import { DraggableSubtaskList } from "@/feature/task-details/components/draggable-subtask-list";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import Toast from "react-native-toast-message";

type SubtasksEditorProps = {
  parentTask: TaskDetailDTO;
  onRefreshSubtasks: () => Promise<void>;
  isBreakingDown: boolean;
  isReplacingSubtasks: boolean;
};

const SubtasksEditor = ({
  parentTask,
  onRefreshSubtasks,
  isBreakingDown,
  isReplacingSubtasks,
}: SubtasksEditorProps) => {
  const { t } = useTranslation(["tasks", "common"]);
  const { data: fetchedSubtasks, isLoading } = useSubtasksByParentId(parentTask.id);

  const { deleteSubtask, isDeletingSubtask, toggleSubtaskStatus } = useSubtaskMutations();

  const [isEditMode, setIsEditMode] = useState(false);
  const taskColor = parentTask?.label?.color ?? theme.colors.disabled;

  const onBack = () => {
    setIsEditMode(false);
  };

  const handleRefresh = async () => {
    await onRefreshSubtasks();
  };

  const handleEdit = () => {
    setIsEditMode(!isEditMode);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteSubtask({ subtaskId: id, parentTaskId: parentTask.id });
    } catch (error) {
      console.error("Failed to delete subtask:", error);
      Toast.show({
        type: "error",
        text1: t("tasks:details.failedToDeleteSubtask"),
      });
    }
  };

  if (isLoading || isBreakingDown || isReplacingSubtasks || isDeletingSubtask) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-base font-baloo text-primary">
          {t("tasks:details.loadingSubtasks")}
        </Text>
      </View>
    );
  }

  if (!fetchedSubtasks || fetchedSubtasks.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-base font-baloo text-primary">
          {t("tasks:details.noSubtasksYet")}
        </Text>
        <TouchableOpacity onPress={onBack} className="mt-4">
          <Text className="text-blue-500 font-balooSemiBold">{t("common:buttons.goBack")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="font-balooBold text-2xl" style={{ color: theme.colors.onSurface }}>
          {t("tasks:details.subtasks")}
        </Text>

        <View className="flex-row items-center mr-1">
          {!isEditMode && (
            <TouchableOpacity onPress={handleRefresh} className="p-2">
              <MaterialIcons name="sync" size={26} color={theme.colors.disabled} />
            </TouchableOpacity>
          )}
          {isEditMode ? (
            <TouchableOpacity onPress={handleEdit} className="px-2 py-1">
              <Text className="font-balooBold text-lg" style={{ color: theme.colors.highlight }}>
                {t("tasks:details.complete")}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleEdit} className="p-2">
              <MaterialIcons name="swap-vert" size={26} color={theme.colors.disabled} />
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => console.log("Add subtask clicked")} className="p-2 ml-1">
            <MaterialIcons name="add" size={28} color={theme.colors.disabled} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Subtasks List */}
      <View className="flex-1">
        <DraggableSubtaskList
          subtasks={fetchedSubtasks}
          isEditMode={isEditMode}
          onDelete={handleDelete}
          onToggle={(subtaskId) => toggleSubtaskStatus({ subtaskId, parentTaskId: parentTask.id })}
          color={taskColor}
        />
      </View>

      {isEditMode && (
        <View className="mx-0 mb-10 mt-4 py-2.5 items-center justify-center">
          <Text className="font-baloo text-[#8BC34A] text-lg text-center">
            {t("tasks:details.dragToReorder")}
          </Text>
        </View>
      )}
    </View>
  );
};

export default SubtasksEditor;
