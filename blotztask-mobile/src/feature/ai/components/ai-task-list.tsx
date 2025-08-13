import React, { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Checkbox } from "react-native-paper";
import { COLORS } from "@/shared/constants/colors";
import uuid from "react-native-uuid";
import { AiTaskDTO } from "../models/ai-task-dto";
import { convertAiTaskToAddTaskItemDTO } from "../services/util/util";
import { format } from "date-fns";
import { addTaskItem } from "@/feature/task/services/task-service";

export default function AiTaskList({
  tasks,
  onEditTask,
}: {
  tasks: AiTaskDTO[];
  onEditTask: (taskId: string, newTitle: string) => void;
}) {
  if (tasks.length === 0) return null;
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const handleAddTask = async (task: AiTaskDTO) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(task.id)) next.delete(task.id);
      return next;
    });
    const newTask = convertAiTaskToAddTaskItemDTO(task);
    try {
      await addTaskItem(newTask);
      console.log("task added successfully!");
    } catch (error) {
      console.log("add task failed", error);
    }
  };

  return (
    <View className="items-start mt-2">
      {tasks.map((task) => {
        const isChecked = checkedIds.has(task.id);
        return (
          <View
            className="flex-row w-full items-center justify-between"
            key={uuid.v4().toString()}
          >
            <View className="flex-row items-center rounded-2xl bg-white mb-3 px-4 py-3 flex-1">
              <Checkbox
                status={isChecked ? "checked" : "unchecked"}
                onPress={() => handleAddTask(task)}
              />
              <View className="w-[5px] bg-gray-300 h-full min-h-[40px] mr-4 rounded-md" />
              <View className="flex-col">
                <TextInput
                  value={task.title}
                  onChangeText={(text) => onEditTask(task.id, text)}
                  style={{ fontSize: 16, fontWeight: "600" }}
                  multiline={true}
                  scrollEnabled={false}
                />
                <View className="flex-row my-1">
                  <MaterialIcons
                    name="schedule"
                    size={20}
                    color={COLORS.primary}
                  />
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
      })}
    </View>
  );
}
