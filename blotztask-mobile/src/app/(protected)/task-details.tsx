import React, { useState } from "react";
import { View, ScrollView, SafeAreaView, Text, TextInput, TouchableOpacity } from "react-native";
import { IconButton } from "react-native-paper";
import { useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { format } from "date-fns";
import { TaskStatusType } from "@/feature/task/components/ui/task-status-select";

export default function TaskDetailsScreen() {
  const { taskId, title, startTime, endTime, isDone, label } = useLocalSearchParams();
  const taskStatus: TaskStatusType = isDone === "true" ? "done" : "todo";

  const [activeTab, setActiveTab] = useState<"Details" | "Subtasks">("Details");

  const handleEdit = () => console.log("task edit pressed");

  const TaskDateRange = ({ startTime, endTime }: { startTime?: string; endTime?: string }) => {
    const formatDate = (val?: string) => (val ? format(new Date(val), "dd/MM/yyyy hh:mm a") : "-");
    return (
      <View className="flex-row items-center justify-around mb-8">
        {/* Start */}
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full border-2 border-gray-500 border-dashed justify-center items-center mr-2">
            <MaterialIcons name="schedule" size={20} color="#6B7280" />
          </View>
          <View>
            <Text className="font-baloo">Start from</Text>
            <Text className="font-balooBold">{formatDate(startTime)}</Text>
          </View>
        </View>
        {/* End */}
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full border-2 border-gray-500 border-dashed justify-center items-center mr-2">
            <MaterialIcons name="schedule" size={20} color="#6B7280" />
          </View>
          <View>
            <Text className="font-baloo">End at</Text>
            <Text className="font-balooBold">{formatDate(endTime)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const DetailsTab = () => (
    <ScrollView>
      <Text>DETAILS TAB</Text>
      <TextInput
        placeholder="Add any task details..."
        multiline
        style={{ flex: 1, fontSize: 16, textAlignVertical: "top" }}
      />
    </ScrollView>
  );

  const SubtasksTab = () => (
    <ScrollView>
      <Text>SUBTASKS TAB</Text>
      <Text>Subtasks content here</Text>
    </ScrollView>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View>
        <ScrollView className="px-4 py-6" contentContainerStyle={{ paddingBottom: 16 }}>
          {/* Task Status and Label */}
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
          <View className="flex-row items-start justify-center mb-8">
            <Text className="flex-1 font-balooBold text-5xl leading-normal">{title}</Text>
            <IconButton icon={"pencil"} onPress={handleEdit} iconColor="black" />
          </View>

          {/* Task Date Range */}
          <TaskDateRange startTime={startTime as string} endTime={endTime as string} />

          {/* Tabs Switch */}
          <View className="flex-row justify-around my-4 border-b border-gray-300">
            <TouchableOpacity onPress={() => setActiveTab("Details")}>
              <Text
                className={`text-lg font-bold ${activeTab === "Details" ? "text-blue-500" : "text-gray-500"}`}
              >
                Details
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab("Subtasks")}>
              <Text
                className={`text-lg font-bold ${activeTab === "Subtasks" ? "text-blue-500" : "text-gray-500"}`}
              >
                Subtasks
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Render the active tab */}
        <View>{activeTab === "Details" ? <DetailsTab /> : <SubtasksTab />}</View>
      </View>
    </SafeAreaView>
  );
}
