import TaskForm from "@/feature/task/forms/task-form";
import { useLocalSearchParams } from "expo-router";

const TaskEditScreen = () => {
  const { id } = useLocalSearchParams();
  // fetch task by id from store or API
  const task = { title: "Existing", description: "..." };

  return (
    <TaskForm
      mode="edit"
      defaultValues={task}
      onSubmit={(task) => {
        // update API call / store update
      }}
    />
  );
};

export default TaskEditScreen;
