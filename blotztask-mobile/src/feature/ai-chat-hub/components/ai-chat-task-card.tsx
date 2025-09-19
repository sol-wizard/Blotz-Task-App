import { View, Text } from "react-native";
import { AiTaskDTO } from "../models/ai-task-dto";
import { useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "@/shared/constants/colors";
import { CustomCheckbox } from "@/shared/components/ui/custom-checkbox";
import { format, parseISO } from "date-fns";
import { convertAiTaskToAddTaskItemDTO } from "../util/ai-task-generator-util";
import { useSelectedDayTaskStore } from "@/feature/task/stores/selectedday-task-store";

const formatTime = (iso?: string, fmt: string = "MM-dd HH:mm"): string =>
  iso ? format(parseISO(iso), fmt) : "";

export const AIChatTaskCard = ({ task, className }: { task: AiTaskDTO; className?: string }) => {
  const [isTaskAdded, setTaskIsAdded] = useState(task.isAdded);
  const { addTask } = useSelectedDayTaskStore();

  const handleAddTask = async (task: AiTaskDTO) => {
    const newTask = convertAiTaskToAddTaskItemDTO(task);

    if (!isTaskAdded) {
      try {
        addTask(newTask);
        setTaskIsAdded(true);
      } catch (error) {
        console.log("add task failed", error);
      }
    } else {
      console.log("Task has already been added to database.");
    }
  };

  return (
    <View className="flex-row w-full items-center">
      <View
        className={`flex-row items-center rounded-2xl bg-white mb-3 px-4 py-3 flex-1 ${className}`}
      >
        <CustomCheckbox checked={isTaskAdded} onPress={() => handleAddTask(task)} />

        <View className="flex-1 min-w-0 ml-3">
          <Text
            className="flex-shrink min-w-0 text-base font-semibold"
            lineBreakStrategyIOS="hangul-word" // For IOS to handle Chinese/Japaness/Korean line break issue
          >
            {task.title}
          </Text>

          {(task.startTime || task.endTime) && (
            <View className="flex-row mt-1 items-center">
              <MaterialIcons name="schedule" size={20} color={COLORS.primary} />
              <View className="flex-col ml-2">
                {task.startTime && (
                  <Text className="text-base text-primary">{formatTime(task.startTime)}</Text>
                )}
                {task.endTime && (
                  <Text className="text-base text-primary">{formatTime(task.endTime)}</Text>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};
