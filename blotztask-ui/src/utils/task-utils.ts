import { TaskDetailDTO } from "@/model/task-detail-dto";

export const isTaskOverdue = (task: TaskDetailDTO): boolean => {
    if (task.isDone) return false;
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    return dueDate < now;
}