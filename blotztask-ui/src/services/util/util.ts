import { EditTaskItemDTO } from '@/model/edit-task-item-dto';
import { RawAddTaskDTO } from '@/model/raw-add-task-dto';
import { RawEditTaskDTO } from '@/model/raw-edit-task-dto';
import { AddTaskItemDTO } from '@/model/add-task-item-dto';
import { parse, set } from 'date-fns';

export const convertToDueDateFormat = (date: Date, time?: string): { dueDate: string; hasTime: boolean } => {
  if (time) {
    const parsedTime = parse(time, 'h:mm a', new Date());
    const hours = parsedTime.getHours();
    const minutes = parsedTime.getMinutes();
    const dateWithTime = set(date, { hours, minutes });
    return {
      dueDate: dateWithTime.toISOString(),
      hasTime: true,
    };
  } else {
    return {
      dueDate: date.toISOString(),
      hasTime: false,
    };
  }
};

export const mapRawAddTaskDTOtoAddTaskItemDTO = (
  taskDetails: RawAddTaskDTO,
  dueDate: string,
  hasTime: boolean
): AddTaskItemDTO => {
  return {
    title: taskDetails.title,
    description: taskDetails.description ?? '',
    dueDate,
    labelId: taskDetails.labelId ?? 6,
    hasTime,
  };
};

export const mapRawEditTaskDTOtoEditTaskItemDTO = (
  taskEditForm: RawEditTaskDTO,
  dueDate: string,
  hasTime: boolean
): EditTaskItemDTO => {
  return {
    id: taskEditForm.id,
    title: taskEditForm.title,
    description: taskEditForm.description,
    isDone: taskEditForm.isDone,
    labelId: taskEditForm.labelId,
    dueDate,
    hasTime,
  };
};
