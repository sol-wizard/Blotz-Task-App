import { AddTaskItemDTO } from "../../models/add-task-item-dto";
import AddTaskFormField from "../task-form-schema";

export function toAddTaskItemDTO(form: AddTaskFormField): AddTaskItemDTO {
  return {
    title: (form.title ?? "").trim(),
    description: (form.description ?? "").trim(),
    endTime: "2025-08-12T00:00:00.000Z",
    hasTime: false,
    labelId: 6,
  };
}
