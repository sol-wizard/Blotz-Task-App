import { AddTaskItemDTO } from "../models/add-task-item-dto";
import TaskFormField from "../models/task-form-schema";

export function toAddTaskItemDTO(form: TaskFormField): AddTaskItemDTO {
  return {
    title: (form.title ?? "").trim(),
    description: (form.description ?? "").trim(),
    startTime: form.startTime ?? undefined,
    endTime: form.endTime ?? undefined,
    hasTime: false,
    labelId: form.labelId,
  };
}
