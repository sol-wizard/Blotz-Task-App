import { View, Text, Pressable, Image, ActivityIndicator} from "react-native";
import { FloatingTaskDTO } from "../models/floating-task-dto";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { format } from "date-fns";
import { getLabelIcon } from "../utils/get-label-icon";
import { estimateTaskTime } from "../services/task-time-estimate-service";
import { useState } from "react";
import { FloatingTaskTimeEstimateModal } from "./floating-task-time-estimate-modal";
import { TaskTimeEstimation } from "../models/task-time-estimation";
import { convertSubtaskTimeForm } from "@/feature/task-details/utils/convert-subtask-time-form";

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
  onDelete: (id: number) => void;
  onPressCard: (task: FloatingTaskDTO) => void;
}) => {
  const iconSource = getLabelIcon(floatingTask.label?.name);

  const [isEstimating, setIsEstimating] = useState(false);
  const [estimate, setEstimate] = useState<TaskTimeEstimation | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeModal = () => {
    setIsModalVisible(false);
    setError(null);
    setEstimate(null);
  };


  const handleEstimateTime = async (task: FloatingTaskDTO) => {
    try {
      setIsModalVisible(true);      
      setIsEstimating(true);        

      const payload = {
        id: task.id,
        title: task.title,
        description: task.description,
      };

      const result = await estimateTaskTime(payload);

      const formatted = convertSubtaskTimeForm(result.duration);

      if (formatted == null) {
        setError("Could not estimate time, please try again later.");
        setEstimate(null);
      } else {
        setEstimate({ ...result, duration: formatted });
      }
    } catch (e) {
      console.log("estimateTaskTime error:", e);
      setError("Could not estimate time, please try again later.");
    } finally {
      setIsEstimating(false);      
    }
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
          <Pressable onPress={() => onDelete(floatingTask.id)} disabled={isDeleting}>
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
        onClose={closeModal}
        durationText={estimate?.duration ?? undefined}
        error={error}
        isEstimating={isEstimating}
      />

    </View>
  );
};
