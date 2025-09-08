import { TextInput, View, Text } from "react-native";
import { AiTaskDTO } from "../models/ai-task-dto";
import { useState } from "react";
import { addTaskItem } from "@/feature/task/services/task-service";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "@/shared/constants/colors";
import { CustomCheckbox } from "@/shared/components/ui/custom-checkbox";
import { format, parseISO } from "date-fns";
import { convertAiTaskToAddTaskItemDTO } from "../util/ai-task-generator-util";

const formatTime = (iso?: string, fmt: string = "MM-dd HH:mm"): string =>
  iso ? format(parseISO(iso), fmt) : "";

export const AIChatTaskCard = ({ task, className }: { task: AiTaskDTO; className?: string }) => {
  const [isTaskAdded, setTaskIsAdded] = useState(task.isAdded);

  const handleAddTask = async (task: AiTaskDTO) => {
    const newTask = convertAiTaskToAddTaskItemDTO(task);
    if (!isTaskAdded) {
      try {
        await addTaskItem(newTask);
        setTaskIsAdded(true);
      } catch (error) {
        console.log("add task failed", error);
      }
    } else {
      console.log("Task has already been added to database.");
    }
  };

  const onEditTask = (id: string) => {
    console.log("task edited");
  };

  return (
    <View className="flex-row w-full items-center justify-between">
      <View
        className={`flex-row items-center rounded-2xl bg-white mb-3 px-4 py-3 flex-1 ${className}`}
      >
        <CustomCheckbox checked={isTaskAdded} onPress={() => handleAddTask(task)} />

        <View className="w-[5px] bg-gray-300 h-full min-h-[40px] mr-4 rounded-md" />
        <View className="flex-col">
          <TextInput
            value={task.title}
            onChangeText={(t) => onEditTask(task.id)}
            style={{ fontSize: 16, fontWeight: "600" }}
            multiline={true}
            scrollEnabled={false}
          />

          {/* 
          Shows nothing if both times are missing.
          Shows only start or end time if just one exists.
          Shows startTime - endTime if both exist.
          */}

          {task.startTime || task.endTime ? (
            <View className="flex-row my-1">
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
          ) : null}
        </View>
      </View>
    </View>
  );
};
