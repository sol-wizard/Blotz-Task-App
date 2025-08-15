import { AddTaskItemDTO } from "../../models/add-task-item-dto";
import AddTaskFormField from "../task-form-schema";

export function toAddTaskItemDTO(form: AddTaskFormField): AddTaskItemDTO {
  return {
    title: (form.title ?? "").trim(),
    description: (form.description ?? "").trim(),
    startTime: new Date(),
    endTime: new Date(form.endTime),
    hasTime: false,
    labelId: form.labelId,
  };
}
