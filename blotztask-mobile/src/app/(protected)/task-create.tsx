import TaskForm from "@/feature/task-add-edit/task-form";
import { TaskFormField } from "@/feature/task-add-edit/models/task-form-schema";
import { mapFormToAddTaskItemDTO } from "@/feature/task-add-edit/util/form-to-task-dto-mapper";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { useSelectedDayTaskStore } from "@/shared/stores/selectedday-task-store";

const TaskCreateScreen = () => {
  const router = useRouter();
  const { addTask } = useSelectedDayTaskStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTaskSubmit = async (formValues: TaskFormField) => {
    try {
      setIsSubmitting(true);

      const dto = mapFormToAddTaskItemDTO(formValues);
      addTask(dto);

      router.back();
      console.log("Task created successfully");
    } catch (error) {
      console.error("Failed to create task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return <Text>Creating task...</Text>;
  }

  return <TaskForm mode="create" onSubmit={handleTaskSubmit} />;
};

export default TaskCreateScreen;
