import { EditTaskItemDTO } from '@/model/edit-task-item-dto';
import { RawAddTaskDTO } from '@/model/raw-add-task-dto';
import { RawEditTaskDTO } from '@/model/raw-edit-task-dto';
import { AddTaskItemDTO } from '@/model/add-task-item-dto';
import { parse, set } from 'date-fns';

export const mapRawAddTaskDTOtoAddTaskItemDTO = (taskDetails: RawAddTaskDTO): AddTaskItemDTO => {
  let dateTime: string;
  if (taskDetails.time) {
    const parsedTime = parse(taskDetails.time, 'h:mm a', new Date());
    const hours = parsedTime.getHours();
    const minutes = parsedTime.getMinutes();
    const dateWithTime = set(taskDetails.date, { hours, minutes });
    dateTime = dateWithTime.toISOString();
  } else {
    dateTime = taskDetails.date.toISOString();
  }
  const addTaskForm: AddTaskItemDTO = {
    title: taskDetails.title,
    description: taskDetails.description ?? '',
    dueDate: dateTime,
    labelId: taskDetails.labelId ?? 6,
  };
  return addTaskForm;
};

export const mapRawEditTaskDTOtoAddTaskItemDTO = (taskEditForm: RawEditTaskDTO): EditTaskItemDTO => {
  let dateTime: string;
  if (taskEditForm.time) {
    const parsedTime = parse(taskEditForm.time, 'h:mm a', new Date());

    const hours = parsedTime.getHours();
    const minutes = parsedTime.getMinutes();

    const dateWithTime = set(taskEditForm.date, { hours, minutes });
    dateTime = dateWithTime.toISOString();
  } else {
    dateTime = taskEditForm.date.toISOString();
  }

  const taskEditDetails: EditTaskItemDTO = {
    id: taskEditForm.id,
    title: taskEditForm.title,
    description: taskEditForm.description,
    isDone: taskEditForm.isDone,
    labelId: taskEditForm.labelId,
    dueDate: dateTime,
  };

  return taskEditDetails;
};
