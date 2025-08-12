import { AddTaskItemDTO } from "../../models/add-task-item-dto";
import AddTaskFormField from "../task-form-schema";

export function toAddTaskItemDTO(form: AddTaskFormField): AddTaskItemDTO {
  return {
    title: (form.title ?? "").trim(),
    description: (form.description ?? "").trim(),
    endTime: form.endTime,
    hasTime: false,
    labelId: form.labelId ?? 6,
  };
}
