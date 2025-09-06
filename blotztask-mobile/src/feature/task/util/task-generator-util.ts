import { AddTaskItemDTO } from "../models/add-task-item-dto";
<<<<<<< HEAD
<<<<<<< HEAD
import TaskFormField from "../models/task-form-schema";
=======
import TaskFormField from "./task-form-schema";
>>>>>>> 6eb4676 (Frontend refactor (#467))
=======
import TaskFormField from "../models/task-form-schema";
>>>>>>> c05ce2d (Unify code style (#462))

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
