import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Keyboard, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import TaskDateRange from "../../feature/task-details/components/task-date-range";
import DetailsView from "../../feature/task-details/components/details-view";
import SubtasksView from "../../feature/task-details/components/subtasks-view";
import { theme } from "@/shared/constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTaskById } from "@/shared/hooks/useTaskbyId";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { MaterialCommunityIcons} from "@expo/vector-icons";

type tabTypes = "Details" | "Subtasks";
export default function TaskDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ taskId: string }>();
  const taskId = Number(params.taskId ?? "");
  const { selectedTask, isLoading } = useTaskById({ taskId });
  const { updateTask, isUpdating } = useTaskMutations();
  const [descriptionText, setDescriptionText] = useState("");
  const [activeTab, setActiveTab] = useState<tabTypes>("Details");

  useEffect(() => {
    if (selectedTask) {
      setDescriptionText(selectedTask.description || "");
    }
  }, [selectedTask]);

  const handleUpdateDescription = useCallback(async () => {
    if (!selectedTask) return;

    const trimmed = descriptionText.trim();
    const original = (selectedTask.description ?? "").trim();

    // 沒改內容就不打 API
    if (trimmed === original) return;

    await updateTask({
      id: selectedTask.id,
      title: selectedTask.title,
      description: trimmed,
      startTime: selectedTask.startTime ? new Date(selectedTask.startTime) : undefined,
      endTime: selectedTask.endTime ? new Date(selectedTask.endTime) : undefined,
      labelId: selectedTask.label?.labelId,
      timeType: selectedTask.timeType ?? null,
    });
  }, [selectedTask, descriptionText, updateTask]);

  if (!selectedTask) {
    console.warn("No selected task found");
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg text-gray-600">Selected Task not found.</Text>
        <TouchableOpacity
          onPress={async () => {
            await handleUpdateDescription(descriptionText);
            router.back();
          }}
        >
          <Text className="text-blue-500 mt-2">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading || isUpdating) {
    return <LoadingScreen />;
  }

  const canSaveDescription =
    descriptionText.trim() !== (selectedTask.description ?? "").trim();

  return (
    <SafeAreaView
      edges={["top"]}
      className="flex-1"
      style={{ backgroundColor: selectedTask.label?.color ?? theme.colors.fallback }}
    >
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
        }}
      >
        <View className="py-6 px-8">
          <View className="flex-row items-center mb-4 mt-6">
            <View className="px-3 py-1 rounded-xl border border-black">
              <Text className={`text-sm font-medium text-black`}>
                {selectedTask.isDone ? "Done" : "To Do"}
              </Text>
            </View>
            {selectedTask.label && (
              <View className="ml-2 px-3 py-1 rounded-xl border border-black">
                <Text className="text-sm font-medium text-black">{selectedTask.label?.name}</Text>
              </View>
            )}
          </View>

          <View className="flex-row items-start justify-center mb-4">
            <Text className="flex-1 font-balooBold text-4xl leading-normal">
              {selectedTask.title}
            </Text>
            <MaterialCommunityIcons
              name="pencil-minus-outline"
              onPress={async () => {
                await handleUpdateDescription();
                router.push({
                  pathname: "/(protected)/task-edit",
                  params: { taskId: selectedTask.id },
                });
              }}
              size={28}
            />
          </View>

          {/* Task Date Range */}
          <TaskDateRange
            startTime={selectedTask.startTime as string}
            endTime={selectedTask.endTime as string}
          />
        </View>
      </TouchableWithoutFeedback>

      {/* Tabs Switch*/}
      <View className="flex-1 pt-6 px-6 bg-white rounded-t-[3rem]">
        <View className="flex-row justify-around mb-6">
          <DetailsView
            taskDescription={descriptionText}
            setDescription={setDescriptionText}
            canSave={canSaveDescription}
            onSave={handleUpdateDescription}
          />
          
        </View>

        {/* Render the active tab */}
        <View className="flex-1 px-4">
          {/* {activeTab === "Details" ? (
            <DetailsView taskDescription={descriptionText} setDescription={setDescriptionText} />
          ) : (
            <SubtasksView parentTask={selectedTask} />
          )} */}

          <SubtasksView parentTask={selectedTask} />
        </View>
      </View>
    </SafeAreaView>
  );
}
