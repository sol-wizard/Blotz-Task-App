import { View, Text, Pressable, Image } from "react-native";
import { FloatingTaskDTO } from "../models/floating-task-dto";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { format } from "date-fns";
import { getLabelIcon } from "../utils/get-label-icon";
import { estimateTaskTime } from "../services/task-time-estimate-service";

export const FloatingTaskCard = ({
  floatingTask,
  isToggled,
  onToggle,
}: {
  floatingTask: FloatingTaskDTO;
  isToggled: boolean;
  onToggle: () => void;
}) => {
  const iconSource = getLabelIcon(floatingTask.label?.name);

  const handleEstimateTime = async (floatingTask: FloatingTaskDTO) => {
    const floatingTaskForEstimate = {
      id: floatingTask.id,
      title: floatingTask.title,
      description: floatingTask.description,
    };
    const result = await estimateTaskTime(floatingTaskForEstimate);
  };

  return (
    <View className="mb-4">
      <Pressable onLongPress={onToggle}>
        <View
          className={`bg-white rounded-3xl p-4 ${isToggled ? "border-2 border-[#3D8DE0]" : ""}`}
        >
          <Text className="text-xl font-semibold text-black font-baloo">{floatingTask.title}</Text>

          <Text className="mt-2 text-[13px] text-[#9CA3AF] leading-snug font-balooThin">
            {floatingTask.description}
          </Text>

          <View className="mt-4 flex-row items-center justify-between">
            <Text className="text-xs text-[#6B7280] font-balooThin">
              {floatingTask.createdAt && format(floatingTask.createdAt, "dd MMM HH:mm")}
            </Text>

            <View className="w-6 h-6 items-center justify-center">
              <Image source={iconSource} className="w-8 h-8" />
            </View>
          </View>
        </View>
      </Pressable>

      {isToggled && (
        <View className="flex-row justify-end mt-3">
          <Pressable>
            <View className="w-8 h-8 bg-warning rounded-xl items-center justify-center">
              <MaterialCommunityIcons name="trash-can-outline" color="#fff" size={18} />
            </View>
          </Pressable>

          <Pressable onPress={() => handleEstimateTime(floatingTask)}>
            <View className="w-8 h-8 bg-[#E3EFFE] rounded-xl items-center justify-center ml-2">
              <MaterialCommunityIcons name="plus" color="#3D8DE0" size={18} />
            </View>
          </Pressable>
        </View>
      )}
    </View>
  );
};
