import { View, Text, TouchableOpacity, Platform } from "react-native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { theme } from "@/shared/constants/theme";
import MaterialIcons from "@react-native-vector-icons/material-icons/static";
import { useSubtaskMutations } from "../hooks/useSubtaskMutations";
import { useSubtasksByParentId } from "@/feature/task-details/hooks/useSubtasksByParentId";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import Toast from "react-native-toast-message";
import { BreakdownResultDTO } from "../models/breakdown-result-dto";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { SubtaskDTO } from "@/feature/task-details/models/subtask-dto";
import SubtaskItem from "@/feature/task-details/components/subtask-item";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SubtasksEditorProps = {
  parentTask: TaskDetailDTO;
  onRefreshSubtasks: () => Promise<BreakdownResultDTO | undefined>;
  isRefreshingSubtasks: boolean;
};

const SubtasksEditor = ({
  parentTask,
  onRefreshSubtasks,
  isRefreshingSubtasks,
}: SubtasksEditorProps) => {
  const { t } = useTranslation(["tasks", "common"]);
  const { data: fetchedSubtasks, isLoading } = useSubtasksByParentId(parentTask.id!);

  const { deleteSubtask, isDeletingSubtask, toggleSubtaskStatus, addSubtask, isAddingSubtask } =
    useSubtaskMutations();

  const [isEditMode, setIsEditMode] = useState(false);
  const [draggableSubtasks, setDraggableSubtasks] = useState<SubtaskDTO[]>(fetchedSubtasks ?? []);
  const { bottom } = useSafeAreaInsets();
  const listBottomPadding = Platform.OS === "android" ? bottom + 12 : 0;

  const renderItem = ({ item, drag }: RenderItemParams<SubtaskDTO>) => (
    <ScaleDecorator>
      <SubtaskItem
        item={item}
        onToggle={(id) => toggleSubtaskStatus({ subtaskId: id, parentTaskId: parentTask.id! })}
        isEditMode={isEditMode}
        onDelete={handleDelete}
        drag={drag}
        parentTaskId={parentTask.id!}
      />
    </ScaleDecorator>
  );

  const handleDelete = async (id: number) => {
    try {
      await deleteSubtask({ subtaskId: id, parentTaskId: parentTask.id! });
    } catch (error) {
      console.error("Failed to delete subtask:", error);
      Toast.show({
        type: "error",
        text1: t("tasks:details.failedToDeleteSubtask"),
      });
    }
  };

  const handleAddSubtask = async () => {
    addSubtask({
      parentTaskId: parentTask.id!,
      title: "New subtask",
      duration: "00:00:00",
      order: (fetchedSubtasks?.length ?? 0) + 1,
    });
  };

  if (isLoading || isRefreshingSubtasks || isDeletingSubtask) {
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
        <TouchableOpacity onPress={() => setIsEditMode(false)} className="mt-4">
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
            <TouchableOpacity
              onPress={async () => {
                await onRefreshSubtasks();
                setDraggableSubtasks(fetchedSubtasks ?? []);
                console.log("fetched subtasks after refresh:", fetchedSubtasks);
              }}
              className="p-2"
            >
              <MaterialIcons name="sync" size={26} color={theme.colors.disabled} />
            </TouchableOpacity>
          )}
          {isEditMode ? (
            <TouchableOpacity onPress={() => setIsEditMode(!isEditMode)} className="px-2 py-1">
              <Text className="font-balooBold text-lg" style={{ color: theme.colors.highlight }}>
                {t("tasks:details.complete")}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setIsEditMode(!isEditMode)} className="p-2">
              <MaterialIcons name="swap-vert" size={26} color={theme.colors.disabled} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleAddSubtask}
            disabled={isAddingSubtask}
            className="p-2 ml-1"
          >
            <MaterialIcons name="add" size={28} color={theme.colors.disabled} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Subtasks List */}
      <View className="flex-1">
        <DraggableFlatList
          data={draggableSubtasks}
          onDragEnd={({ data: newData }: { data: SubtaskDTO[] }) => setDraggableSubtasks(newData)}
          keyExtractor={(item: SubtaskDTO) => item.title.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: listBottomPadding }}
          autoscrollThreshold={40}
          autoscrollSpeed={100}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
