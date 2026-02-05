import { View, Text, Pressable, ActivityIndicator } from "react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSubtaskMutations } from "../hooks/useSubtaskMutations";
import { useSubtasksByParentId } from "../hooks/useSubtasksByParentId";
import { AddSubtaskDTO } from "@/feature/task-details/models/add-subtask-dto";
import SubtasksEditor from "./subtasks-editor";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { usePostHog } from "posthog-react-native";
import { EVENTS } from "@/shared/constants/posthog-events";
import { darkenHex } from "@/shared/util/color";

type SubtaskViewProps = {
  parentTask: TaskDetailDTO;
};

const SubtasksView = ({ parentTask }: SubtaskViewProps) => {
  const { t } = useTranslation("tasks");
  const { breakDownTask, isBreakingDown, replaceSubtasks, isReplacingSubtasks } =
    useSubtaskMutations();
  const posthog = usePostHog();

  const { data: fetchedSubtasks, isLoading: isLoadingSubtasks } = useSubtasksByParentId(
    parentTask.id,
  );

  const displaySubtasks = fetchedSubtasks || [];
  const hasSubtasks = displaySubtasks.length > 0;

  const handleBreakDown = async () => {
    if (isBreakingDown || isReplacingSubtasks) return;

    posthog.capture(EVENTS.BREAKDOWN_TASK);

    try {
      const subtasks = (await breakDownTask(parentTask.id)) ?? [];
      if (subtasks.length > 0) {
        await replaceSubtasks({
          taskId: parentTask.id,
          subtasks: subtasks.map((subtask: AddSubtaskDTO) => ({ ...subtask })),
        });
      }
    } catch (e) {
      console.error("Subtask error:", e);
    }
  };

  const isLoading = isBreakingDown || isReplacingSubtasks || isLoadingSubtasks;

  const labelColor = parentTask.label?.color;
  const fallbackBg = "#EBF0FE";
  const bgColor = labelColor ?? fallbackBg;
  const textColor = darkenHex(bgColor, 0.6);

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
    return <SubtasksEditor parentTask={parentTask} />;
  }

  // Show initial breakdown view if no subtasks exist yet
  return (
    <View>
      <Pressable
        onPress={handleBreakDown}
        disabled={isLoading}
        style={{ backgroundColor: isLoading ? undefined : bgColor }}
        className={`flex-row items-center justify-center self-center mt-8 rounded-2xl h-[55px] w-full ${
          isLoading ? "bg-gray-300" : " active:bg-gray-100"
        }`}
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
