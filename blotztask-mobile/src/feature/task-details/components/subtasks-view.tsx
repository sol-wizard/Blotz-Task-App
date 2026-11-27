import { View, Text, Pressable, ActivityIndicator } from "react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useSubtasksByParentId } from "../hooks/useSubtasksByParentId";
import { useStartTaskBreakdown } from "../hooks/useStartTaskBreakdown";
import { useIsBreakingDown } from "../hooks/useBreakdownJobsStore";
import SubtasksEditor from "./subtasks-editor";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { LABEL_COLOR_PALETTE_BY_ID } from "@/shared/util/label-colors";
import { hasTaskItemId } from "@/shared/util/task-occurrence-identity";
import { BreakdownTaskTarget } from "../services/subtask-service";

type SubtaskViewProps = {
  parentTask: TaskDetailDTO;
  breakdownTarget?: BreakdownTaskTarget;
  onBreakdownComplete?: (parentTaskId: number) => void;
};

const SubtasksView = ({
  parentTask,
  breakdownTarget,
  onBreakdownComplete,
}: SubtaskViewProps) => {
  const { t } = useTranslation("tasks");
  const { startBreakdown, isStartingBreakdown } = useStartTaskBreakdown();
  const parentTaskId = hasTaskItemId(parentTask) ? parentTask.id : null;
  // While it runs, subtasks can't be edited: the finished breakdown replaces them all.
  const isBreakingDown = useIsBreakingDown(parentTaskId) || isStartingBreakdown;
  const canBreakDown = breakdownTarget != null;
  const { data: fetchedSubtasks, isLoading: isLoadingSubtasks } = useSubtasksByParentId(
    parentTaskId,
  );

  const displaySubtasks = fetchedSubtasks || [];
  const hasSubtasks = displaySubtasks.length > 0;

  const handleBreakDown = async () => {
    if (!breakdownTarget || isBreakingDown) return;

    // Returns at once with the task's id; the BreakdownJobsWatcher refreshes the subtasks when done.
    const status = await startBreakdown({ target: breakdownTarget, title: parentTask.title });
    onBreakdownComplete?.(status.taskItemId);
  };

  const isLoading = isBreakingDown || isLoadingSubtasks;

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
        isRefreshingSubtasks={isBreakingDown}
      />
    );
  }

  // Show initial breakdown view if no subtasks exist yet
  return (
    <View>
      <Pressable
        onPress={handleBreakDown}
        disabled={isLoading || !canBreakDown}
        style={{ backgroundColor: isLoading || !canBreakDown ? "#D1D5DB" : bgColor }}
        className="flex-row items-center justify-center self-center mt-8 rounded-2xl h-[55px] w-full"
      >
        {isBreakingDown ? (
          <>
            <ActivityIndicator size="small" color={textColor} />
            <Text style={{ color: textColor }} className="ml-2 text-xl font-balooBold">
              {t("details.breakingDown")}
            </Text>
          </>
        ) : isLoading ? (
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
