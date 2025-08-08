import React from "react";
import { View, Text, TextInput } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { IconButton } from "react-native-paper";
import { COLORS } from "@/shared/constants/colors";
import uuid from "react-native-uuid";
import { AiTaskDTO } from "../models/ai-task-dto";

export default function AiTaskList({
  tasks,
  onDeleteTask,
  onEditTask,
}: {
  tasks: AiTaskDTO[];
  onDeleteTask: (taskId: string) => void;
  onEditTask: (taskId: string, newTitle: string) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <View className="items-start mt-2">
      {tasks.map((task) => (
        <View
          className="flex-row w-full items-center justify-between"
          key={uuid.v4().toString()}
        >
          <View className="flex-row items-center rounded-2xl bg-white mb-3 px-4 py-3 flex-1">
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
                <Text className="text-base text-primary ml-2">
                  10:00am-11:00am
                </Text>
              </View>
            </View>
          </View>

          <IconButton
            icon="trash-can-outline"
            mode="outlined"
            size={20}
            iconColor="#8E8E93"
            containerColor="transparent"
            style={{
              borderColor: "#AEAEB2",
            }}
            onPress={() => onDeleteTask(task.id)}
          />
        </View>
      ))}
    </View>
  );
}
