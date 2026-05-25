import TaskForm from "@/feature/task-add-edit/task-form";
import { useRouter } from "expo-router";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import LoadingScreen from "@/shared/components/loading-screen";
import { TaskUpsertDTO } from "@/shared/models/task-upsert-dto";
import { SafeAreaView } from "react-native-safe-area-context";
import { analytics } from "@/shared/services/analytics";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";

export default function TaskCreateScreen() {
  const router = useRouter();
  const { addTask, isAdding } = useTaskMutations();
  const { t } = useTranslation("tasks");

  const handleTaskSubmit = (submitTask: TaskUpsertDTO) => {
    addTask(submitTask, {
      onSuccess: () => {
        analytics.trackManualTaskCreated();
        router.back();
        Toast.show({ type: "success", text1: t("success.taskCreated") });
      },
    });
  };

  if (isAdding) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <TaskForm mode="create" onSubmit={handleTaskSubmit} />
    </SafeAreaView>
  );
}
