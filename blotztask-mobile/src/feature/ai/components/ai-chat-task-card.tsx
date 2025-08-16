import { TextInput, View, Text } from "react-native";
import { Checkbox } from "react-native-paper";
import { AiTaskDTO } from "../models/ai-task-dto";
import { useState } from "react";
import { convertAiTaskToAddTaskItemDTO } from "../services/util/util";
import { addTaskItem } from "@/feature/task/services/task-service";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "@/shared/constants/colors";
import { format } from "date-fns";

export const AIChatTaskCard = ({ task }: { task: AiTaskDTO }) => {
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
      <View className="flex-row items-center rounded-2xl bg-white mb-3 px-4 py-3 flex-1">
        <Checkbox
          status={isTaskAdded ? "checked" : "unchecked"}
          onPress={() => handleAddTask(task)}
        />
        <View className="w-[5px] bg-gray-300 h-full min-h-[40px] mr-4 rounded-md" />
        <View className="flex-col">
          <TextInput
            value={task?.title}
            onChangeText={(t) => onEditTask(task.id)}
            style={{ fontSize: 16, fontWeight: "600" }}
            multiline={true}
            scrollEnabled={false}
          />
          <View className="flex-row my-1">
            <MaterialIcons name="schedule" size={20} color={COLORS.primary} />
            {task.endTime && (
              <Text className="text-base text-primary ml-2">
                {format(task.endTime, "yyyy-MM-dd")}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};
