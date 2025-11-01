import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Keyboard } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import TaskDateRange from "../../feature/task-details/components/task-date-range";
import DetailsView from "../../feature/task-details/components/details-view";
import SubtasksView from "../../feature/task-details/components/subtasks-view";
import { theme } from "@/shared/constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTaskById } from "@/shared/hooks/useTaskbyId";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type tabTypes = "Details" | "Subtasks";
export default function TaskDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ taskId: string }>();
  const taskId = Number(params.taskId ?? "");
  const { selectedTask, isLoading } = useTaskById({ taskId });
  const { updateTask, isUpdating } = useTaskMutations();
  const [descriptionText, setDescriptionText] = useState(selectedTask?.description || "");
  const [activeTab, setActiveTab] = useState<tabTypes>("Details");

  const descriptionRef = useRef(descriptionText);

  useEffect(() => {
    descriptionRef.current = descriptionText;
  }, [descriptionText]);

  const handleUpdateDescription = async (newDescription: string) => {
    if (!selectedTask) return;
    if (newDescription === (selectedTask.description ?? "")) return;

    await updateTask({
      id: selectedTask.id,
      title: selectedTask.title,
      description: newDescription,
      startTime: selectedTask.startTime ? new Date(selectedTask.startTime) : undefined,
      endTime: selectedTask.endTime ? new Date(selectedTask.endTime) : undefined,
      labelId: selectedTask.label?.labelId,
      timeType: selectedTask.timeType ?? null,
    });
  };
  // to ensure description is updated when navigating back
  useFocusEffect(
    useCallback(() => {
      if (selectedTask?.description != null) {
        setDescriptionText(selectedTask.description);
      }
      return () => {
        handleUpdateDescription(descriptionRef.current || "");
      };
    }, [selectedTask?.description]),
  );

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

  if (isLoading || isUpdating) {
    return <LoadingScreen />;
  }

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
          {/* Task Status + Label */}
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

          {/* Task Title + Edit */}
          <View className="flex-row items-start justify-center mb-4">
            <Text className="flex-1 font-balooBold text-4xl leading-normal">
              {selectedTask.title}
            </Text>
            <MaterialCommunityIcons
              name="pencil-minus-outline"
              onPress={() =>
                router.push({
                  pathname: "/(protected)/task-edit",
                  params: { taskId: selectedTask.id },
                })
              }
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
            <DetailsView taskDescription={descriptionText} setDescription={setDescriptionText} />
          ) : (
            <SubtasksView parentTask={selectedTask} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
