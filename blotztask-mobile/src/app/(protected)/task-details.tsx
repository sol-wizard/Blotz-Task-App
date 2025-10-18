import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { IconButton } from "react-native-paper";
import { useRouter } from "expo-router";
import TaskDateRange from "../../feature/task-details/components/task-date-range";
import DetailsTab from "../../feature/task-details/components/details-tab";
import SubtasksTab from "../../feature/task-details/components/subtasks-tab";

import { theme } from "@/shared/constants/theme";
import { useSelectedTaskState } from "@/shared/stores/selected-task-store";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TaskDetailsScreen() {
  const router = useRouter();
  const selectedTask = useSelectedTaskState();
  const { isDone, title, description, label, startTime, endTime } = selectedTask || {};
  const { selectedTask } = useSelectedTaskStore();
  const [activeTab, setActiveTab] = useState<tabTypes>("Details");
  if (!selectedTask) {
    console.warn("No selected task found");
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg text-gray-600">Selected Task not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-blue-500 mt-2">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const { id, isDone, title, description, label, startTime, endTime } = selectedTask;

  const taskStatus = isDone ? "Done" : "To Do";
  const labelName: string | undefined = label?.name;
  const [activeTab, setActiveTab] = useState<"Details" | "Subtasks">("Details");

  // Use label color or fallback to grey
  const headerBackgroundColor = label?.color ?? theme.colors.fallback;

  const handleEdit = () => {
    router.push({
      pathname: "/(protected)/task-edit",
    });
  };

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: label?.color ?? theme.colors.fallback }}
    >
      <View className="py-6 px-8">
        {/* Task Status + Label */}
        <View className="flex-row items-center mb-4 mt-6">
          <View className="px-3 py-1 rounded-xl border border-black">
            <Text className={`text-sm font-medium text-black`}>
              {taskStatus === "Done" ? "Done" : "To Do"}
            </Text>
          </View>
          {label && (
            <View className="ml-2 px-3 py-1 rounded-xl border border-black">
              <Text className="text-sm font-medium text-black">{labelName}</Text>
            </View>
          )}
        </View>

        {/* Task Title + Edit */}
        <View className="flex-row items-start justify-center mb-4">
          <Text className="flex-1 font-balooBold text-5xl leading-normal">{title}</Text>
          <IconButton
            icon={"pencil"}
            onPress={() =>
              router.push({
                pathname: "/(protected)/task-edit",
              })
            }
            iconColor="black"
          />
        </View>

        {/* Task Date Range */}
        <TaskDateRange startTime={startTime as string} endTime={endTime as string} />
      </View>

      {/* Tabs Switch*/}
      <View className="flex-1 pt-6 px-6 bg-white rounded-t-[3rem]">
        <View className="flex-row justify-around mb-6">
          <TouchableOpacity onPress={() => setActiveTab("Details")} className="flex-1 items-center">
            <Text
              className={"text-lg font-balooBold pb-3"}
              style={{
                color: activeTab === "Details" ? theme.colors.onSurface : theme.colors.primary,
              }}
            >
              Details
            </Text>
            <View
              className="w-full h-1 rounded-full"
              style={{
                backgroundColor:
                  activeTab === "Details" ? theme.colors.onSurface : theme.colors.disabled,
              }}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("Subtasks")}
            className="flex-1 items-center"
          >
            <Text
              className={"text-lg font-balooBold pb-3"}
              style={{
                color: activeTab === "Subtasks" ? theme.colors.onSurface : theme.colors.primary,
              }}
            >
              Subtasks
            </Text>
            <View
              className="w-full h-1 rounded-full"
              style={{
                backgroundColor:
                  activeTab === "Subtasks" ? theme.colors.onSurface : theme.colors.disabled,
              }}
            />
          </TouchableOpacity>
        </View>

        {/* Render the active tab */}
        <View className="flex-1 px-4">
          {activeTab === "Details" ? (
            <DetailsTab taskDescription={description as string} />
          ) : (
            <SubtasksTab taskId={id} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
