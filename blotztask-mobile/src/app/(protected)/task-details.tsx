import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { IconButton } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import TaskDateRange from "../../feature/task-details/components/task-date-range";
import DetailsView from "../../feature/task-details/components/details-view";
import SubtasksView from "../../feature/task-details/components/subtasks-view";
import { theme } from "@/shared/constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTaskById } from "@/shared/hooks/useTaskbyId";

type tabTypes = "Details" | "Subtasks";
export default function TaskDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ taskId: string }>();
  const taskId = Number(params.taskId ?? "");
  const { selectedTask, isLoading } = useTaskById({ taskId });

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
  const { isDone, title, description, label, startTime, endTime } = selectedTask;
  const taskStatus = isDone ? "Done" : "To Do";
  const labelName: string | undefined = label?.name;

  if (isLoading || !selectedTask) {
    return (
      <View style={{ padding: 16 }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={["top"]}
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
                params: { taskId: selectedTask.id },
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
            <Text className={"text-lg font-balooBold pb-3"}>Details</Text>
            {activeTab === "Details" && <View className="w-full h-1 bg-blue-100 rounded-full" />}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("Subtasks")}
            className="flex-1 items-center"
          >
            <Text className={"text-lg font-balooBold pb-3"}>Subtasks</Text>
            {activeTab === "Subtasks" && <View className="w-full h-1 bg-blue-100 rounded-full" />}
          </TouchableOpacity>
        </View>

        {/* Render the active tab */}
        <View className="flex-1 px-4">
          {activeTab === "Details" ? (
            <DetailsView taskDescription={description as string} />
          ) : (
            <SubtasksView parentTask={selectedTask} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
