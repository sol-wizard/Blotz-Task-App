import { View, Text, Pressable, Image, ActivityIndicator } from "react-native";
import { FloatingTaskDTO } from "../models/floating-task-dto";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { addMinutes, format } from "date-fns";
import { getLabelIcon } from "../utils/get-label-icon";
import { useState } from "react";
import { FloatingTaskTimeEstimateModal } from "./floating-task-time-estimate-modal";
import { useEstimateTaskTime } from "../hooks/useEstimateTaskTime";
import { router } from "expo-router";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { convertToDateTimeOffset } from "@/shared/util/convert-to-datetimeoffset";
import { TaskTimeType } from "@/shared/models/task-detail-dto";
import { convertDurationToMinutes, convertDurationToText } from "@/shared/util/convert-duration";

export const FloatingTaskCard = ({
  floatingTask,
  isToggled,
  onToggle,
  isDeleting,
  onDelete,
  onPressCard,
}: {
  floatingTask: FloatingTaskDTO;
  isToggled: boolean;
  onToggle: () => void;
  isDeleting: boolean;
  onDelete: (t: FloatingTaskDTO) => void;
  onPressCard: (task: FloatingTaskDTO) => void;
}) => {
  const iconSource = getLabelIcon(floatingTask.label?.name);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const { updateTask } = useTaskMutations();
  const { estimateTime, isEstimating, timeResult, estimateError } = useEstimateTaskTime();

  const pickTime = () => {
    router.push({
      pathname: "/task-edit",
      params: { taskId: String(floatingTask.id) },
    });
  };

  const handleEstimateTime = (task: FloatingTaskDTO) => {
    setIsModalVisible(true);
    estimateTime(task);
  };

  const handleStartNow = async () => {
    const durationMinutes = convertDurationToMinutes(timeResult ?? "");
    if (durationMinutes === undefined) return;

    const startTime = new Date();
    const endTime = addMinutes(startTime, durationMinutes);

    await updateTask({
      id: floatingTask.id,
      title: floatingTask.title,
      description: floatingTask.description,
      startTime: convertToDateTimeOffset(startTime),
      endTime: convertToDateTimeOffset(endTime),
      labelId: floatingTask.label?.labelId,
      timeType: TaskTimeType.Range,
    });

    setIsModalVisible(false);
  };
  return (
    <View className="mb-4">
      <Pressable
        onLongPress={onToggle}
        onPress={() => {
          if (isToggled) return;
          onPressCard(floatingTask);
        }}
      >
        <View
          className={`bg-white rounded-3xl p-4 ${isToggled ? "border-2 border-[#3D8DE0]" : ""}`}
        >
          <Text className="text-xl font-semibold text-black font-baloo">{floatingTask.title}</Text>

          <Text className="mt-2 text-[13px] text-[#9CA3AF] leading-snug font-balooThin">
            {floatingTask.description}
          </Text>

          <View className="mt-4 flex-row items-center justify-between">
            <Text className="text-xs text-[#6B7280] font-balooThin">
              {floatingTask.createdAt &&
                format(new Date(floatingTask.createdAt + "Z"), "dd MMM HH:mm")}
            </Text>

            <View className="w-6 h-6 items-center justify-center">
              <Image source={iconSource} className="w-8 h-8" />
            </View>
          </View>
        </View>
      </Pressable>

      {isToggled && (
        <View className="flex-row justify-end mt-3">
          <Pressable onPress={() => onDelete(floatingTask)} disabled={isDeleting}>
            <View className="w-8 h-8 bg-warning rounded-xl items-center justify-center">
              {isDeleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialCommunityIcons name="trash-can-outline" color="#fff" size={18} />
              )}
            </View>
          </Pressable>

          <Pressable onPress={() => handleEstimateTime(floatingTask)}>
            <View className="w-8 h-8 bg-[#E3EFFE] rounded-xl items-center justify-center ml-2">
              <MaterialCommunityIcons name="plus" color="#3D8DE0" size={18} />
            </View>
          </Pressable>
        </View>
      )}
      <FloatingTaskTimeEstimateModal
        visible={isModalVisible}
        pickTime={pickTime}
        handleStartNow={handleStartNow}
        setIsModalVisible={setIsModalVisible}
        durationText={convertDurationToText(timeResult ?? "")}
        isEstimating={isEstimating}
        error={estimateError ? "Failed to estimate task time." : null}
      />
    </View>
  );
};
