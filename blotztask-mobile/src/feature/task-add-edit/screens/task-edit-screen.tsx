import TaskForm from "@/feature/task-add-edit/task-form";
import { EditTaskItemDTO } from "@/feature/task-add-edit/models/edit-task-item-dto";
import { useLocalSearchParams, useRouter } from "expo-router";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useTaskById } from "@/shared/hooks/useTaskbyId";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { AddTaskItemDTO } from "@/shared/models/add-task-item-dto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable, StyleProp, ViewStyle, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = { style?: StyleProp<ViewStyle>; };

export const ReturnButton = ({ style }: Props) => {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace("/(protected)/(tabs)");
      }}
      style={[{
          shadowColor: "#1f1e1e",
          shadowOpacity: 0.1,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 1, 
        },
        style,
      ]}
      className="w-12 h-12 rounded-full bg-white shadowOpacity: 0.15 shadowRadius: 6 items-center justify-center"
    >
      <Ionicons name="chevron-back" size={30} color="#555151"/>
    </Pressable>
  );
};


export default function TaskEditScreen() {
  const { updateTask, isUpdating } = useTaskMutations();
  const params = useLocalSearchParams<{ taskId: string }>();
  const taskId = Number(params.taskId ?? "");
  const { selectedTask, isLoading, isFetching } = useTaskById({ taskId });

  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (isLoading || !selectedTask || isUpdating || isFetching) {
    return <LoadingScreen />;
  }

  const taskEditData: EditTaskItemDTO = {
    title: selectedTask.title,
    description: selectedTask.description,
    startTime: selectedTask.startTime,
    endTime: selectedTask.endTime,
    labelId: selectedTask.label ? selectedTask.label.labelId : undefined,
    timeType: selectedTask.timeType,
    notificationId: selectedTask.notificationId,
    alertTime: selectedTask.alertTime,
  };

  const handleTaskSubmit = async (formValues: AddTaskItemDTO) => {
    try {
      await updateTask({
        taskId: selectedTask.id,
        dto: formValues,
      });

      router.back();
    } catch (error) {
      console.error("Failed to submit task:", error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <ReturnButton
        style={{
          position: "absolute",
          top: insets.top + 3,
          left: 16,
          zIndex: 1000,
        }}
      />
      <View style={{ marginTop: 57, flex: 1 }}>
        <TaskForm mode="edit" dto={taskEditData} onSubmit={handleTaskSubmit} />
      </View>
    </SafeAreaView>
  );
}
