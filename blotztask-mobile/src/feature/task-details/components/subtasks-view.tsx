import { View, Text, Pressable, ActivityIndicator } from "react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSubtaskMutations } from "../hooks/useSubtaskMutations";
import { useSubtasksByParentId } from "../hooks/useSubtasksByParentId";
import SubtasksEditor from "./subtasks-editor";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { LABEL_COLOR_PALETTE_BY_ID } from "@/shared/util/label-colors";

type SubtaskViewProps = {
  parentTask: TaskDetailDTO;
};

const SubtasksView = ({ parentTask }: SubtaskViewProps) => {
  const { t } = useTranslation("tasks");
  const { breakDownAndReplaceSubtasks, isBreakingDownAndReplacingSubtasks } = useSubtaskMutations();
  const { data: fetchedSubtasks, isLoading: isLoadingSubtasks } = useSubtasksByParentId(
    parentTask.id,
  );

  const displaySubtasks = fetchedSubtasks || [];
  const hasSubtasks = displaySubtasks.length > 0;

  const handleBreakDown = async () => {
    if (isBreakingDownAndReplacingSubtasks || parentTask.id == null) return;

    return await breakDownAndReplaceSubtasks(parentTask.id);
  };

  const isLoading = isBreakingDownAndReplacingSubtasks || isLoadingSubtasks;

  const fallbackBg = "#EBF0FE";
  const labelId = parentTask.label?.labelId;
  const palette = labelId ? LABEL_COLOR_PALETTE_BY_ID[labelId] : undefined;
  const bgColor = palette?.bg ?? fallbackBg;
  const textColor = palette?.text ?? "#3E415C";

  // Show loading state while fetching
  if (isLoadingSubtasks) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-500 font-baloo">{t("details.loadingSubtasks")}</Text>
      </View>
    );
  }

  // Show manage view if subtasks exist
  if (hasSubtasks) {
    return (
      <SubtasksEditor
        parentTask={parentTask}
        onRefreshSubtasks={handleBreakDown}
        isRefreshingSubtasks={isBreakingDownAndReplacingSubtasks}
      />
    );
  }

  // Show initial breakdown view if no subtasks exist yet
  return (
    <View>
      <Pressable
        onPress={handleBreakDown}
        disabled={isLoading}
        style={{ backgroundColor: isLoading ? "#D1D5DB" : bgColor }}
        className="flex-row items-center justify-center self-center mt-8 rounded-2xl h-[55px] w-full"
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#3b82f6" />
        ) : (
          <>
            <MaterialCommunityIcons name="format-list-checkbox" size={24} color={textColor} />
            <Text style={{ color: textColor }} className="ml-2 text-xl font-balooBold">
              {t("details.breakdownTask")}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
};

export default SubtasksView;
