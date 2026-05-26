import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Keyboard } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import DetailsView from "@/feature/task-details/components/details-view";
import SubtasksView from "@/feature/task-details/components/subtasks-view";
import { theme } from "@/shared/constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTaskById } from "@/shared/hooks/useTaskbyId";
import LoadingScreen from "@/shared/components/loading-screen";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { ASSETS } from "@/shared/constants/assets";
import { convertToDateTimeOffset } from "@/shared/util/convert-to-datetimeoffset";
import {
  TaskRangeTimeCard,
  TaskSingleTimeCard,
} from "@/feature/task-details/components/task-time-card";
import { useTranslation } from "react-i18next";
import { ReturnButton } from "@/shared/components/return-button";

export default function TaskDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ taskId: string }>();
  const taskId = Number(params.taskId ?? "");
  const { selectedTask, isLoading } = useTaskById({ taskId });
  const { updateTask, isUpdating } = useTaskMutations();
  const [descriptionText, setDescriptionText] = useState("");
  const descInitializedRef = useRef(false);
  if (!descInitializedRef.current && selectedTask !== undefined) {
    descInitializedRef.current = true;
    setDescriptionText(selectedTask.description ?? "");
  }
  const { t } = useTranslation();

  const handleUpdateDescription = async (newDescription: string) => {
    if (!selectedTask) return;
    if (newDescription === (selectedTask.description ?? "")) return;

    await updateTask({
      taskId,
      dto: {
        title: selectedTask.title,
        description: newDescription,
        startTime: convertToDateTimeOffset(new Date(selectedTask.startTime)),
        endTime: convertToDateTimeOffset(new Date(selectedTask.endTime)),
        labelId: selectedTask.label?.labelId,
        timeType: selectedTask.timeType,
        notificationId: selectedTask.notificationId,
        isDeadline: selectedTask.isDeadline,
      },
    });
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!selectedTask || !selectedTask.id) {
    console.warn("No selected task found");
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg text-gray-600">{t("tasks:details.notFound")}</Text>
        <TouchableOpacity
          onPress={() => {
            router.back();
          }}
        >
          <Text className="text-blue-500 mt-2">{t("common:buttons.goBack")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canSaveDescription = descriptionText.trim() !== (selectedTask.description ?? "").trim();

  const getTranslatedLabelName = (labelName: string): string => {
    const lowerName = labelName.toLowerCase();
    const translationKey = `tasks:categories.${lowerName}`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : labelName;
  };

  return (
    <SafeAreaView
      edges={["top"]}
      className="flex-1"
      style={{ backgroundColor: selectedTask.label?.color ?? theme.colors.fallback }}
    >
      <View
        pointerEvents="box-none"
        className="flex pt-2 flex-row justify-between w-full px-8 mb-2"
      >
        <ReturnButton />
        <View className="flex-row gap-2">
          <View className="px-3 py-1 rounded-xl border border-black">
            <Text className={`text-sm font-medium text-black`}>
              {selectedTask.isDone ? t("common:status.done") : t("common:status.todo")}
            </Text>
          </View>

          {selectedTask.label && (
            <View className="px-3 py-1 rounded-xl border border-black flex-shrink">
              <Text className="text-sm font-medium text-black" numberOfLines={1}>
                {getTranslatedLabelName(selectedTask.label.name)}
              </Text>
            </View>
          )}
        </View>
      </View>
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
        }}
      >
        <View className="pb-6 px-8">
          <View className="flex-row items-start justify-center my-4">
            <Text className="flex-1 font-balooBold text-3xl leading-normal">
              {selectedTask.title}
            </Text>
            <TouchableOpacity
              onPress={() => {
                router.push({
                  pathname: "/(protected)/task-edit",
                  params: { taskId: selectedTask.id },
                });
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ASSETS.editIcon width={28} height={28} fill="#444964" />
            </TouchableOpacity>
          </View>

          {selectedTask.startTime === selectedTask.endTime ? (
            <TaskSingleTimeCard startTime={selectedTask.startTime} />
          ) : (
            <TaskRangeTimeCard startTime={selectedTask.startTime} endTime={selectedTask.endTime} />
          )}
        </View>
      </TouchableWithoutFeedback>

      <View className="flex-1 pt-6 px-6 bg-white rounded-t-[3rem]">
        <View className="flex-row justify-around mb-6">
          <DetailsView
            taskDescription={descriptionText}
            setDescription={setDescriptionText}
            canSave={canSaveDescription}
            onSave={() => handleUpdateDescription(descriptionText)}
            isUpdating={isUpdating}
          />
        </View>

        <View className="flex-1 px-4">
          <SubtasksView parentTask={selectedTask} />
        </View>
      </View>
    </SafeAreaView>
  );
}
