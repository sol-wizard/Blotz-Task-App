import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { IconButton } from "react-native-paper";
import { useLocalSearchParams } from "expo-router";
import { TaskStatusType } from "@/feature/task/components/ui/task-status-select";
import TaskDateRange from "../../feature/task/components/task-details/task-date-range";
import DetailsTab from "../../feature/task/components/task-details/details-tab";
import SubtasksTab from "../../feature/task/components/task-details/subtasks-tab";

type tabTypes = "Details" | "Subtasks";

export default function TaskDetailsScreen() {
  const { title, description, startTime, endTime, isDone, label } = useLocalSearchParams();
  const taskStatus: TaskStatusType = isDone === "true" ? "done" : "todo";
  const [activeTab, setActiveTab] = useState<tabTypes>("Details");

  // TODO: Implement edit screen
  const handleEdit = () => console.log("task edit pressed");

  return (
    <View className="flex-1 bg-lime-200">
      <View className="py-6 px-8">
        {/* Task Status + Label */}
        <View className="flex-row items-center mb-4">
          <View className="px-3 py-1 rounded-xl border border-black">
            <Text className={`text-sm font-medium text-black`}>
              {taskStatus === "done" ? "Done" : "To Do"}
            </Text>
          </View>
          {label && (
            <View className="ml-2 px-3 py-1 rounded-xl border border-black">
              <Text className="text-sm font-medium text-black">{label}</Text>
            </View>
          )}
        </View>

        {/* Task Title + Edit */}
        <View className="flex-row items-start justify-center mb-4">
          <Text className="flex-1 font-balooBold text-5xl leading-normal">{title}</Text>
          <IconButton icon={"pencil"} onPress={handleEdit} iconColor="black" />
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
            <DetailsTab taskDescription={description as string} />
          ) : (
            <SubtasksTab />
          )}
        </View>
      </View>
    </View>
  );
}
