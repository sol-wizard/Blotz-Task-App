import { useQuery } from "@tanstack/react-query";
import { getAllTasks } from "@/shared/services/task-service";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { taskKeys } from "@/shared/constants/query-key-factory";

export interface ReminderTask extends TaskDetailDTO {
  reminderTime: Date;
}

export const useReminders = () => {
  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: taskKeys.all,
    queryFn: getAllTasks,
  });

  // Filter tasks that have alertTime in the future and are not done
  const reminders: ReminderTask[] = allTasks
    .filter((task) => {
      if (task.isDone) return false;
      if (!task.alertTime) return false;
      
      const alertDate = new Date(task.alertTime);
      return alertDate > new Date();
    })
    .map((task) => ({
      ...task,
      reminderTime: new Date(task.alertTime!),
    }))
    .sort((a, b) => a.reminderTime.getTime() - b.reminderTime.getTime());

  return {
    reminders,
    isLoading,
  };
};
