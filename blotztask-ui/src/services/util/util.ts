import { EditTaskItemDTO } from '@/model/edit-task-item-dto';
import { RawAddTaskDTO } from '@/model/raw-add-task-dto';
import { RawEditTaskDTO } from '@/model/raw-edit-task-dto';
import { AddTaskItemDTO } from '@/model/add-task-item-dto';
import { parse, set } from 'date-fns';

export const combineDateAndTime = (date: Date, time: string): string => {
  const parsedTime = parse(time, 'h:mm a', new Date());
  const hours = parsedTime.getHours();
  const minutes = parsedTime.getMinutes();
  const dateWithTime = set(date, { hours, minutes });
  return dateWithTime.toISOString();
};

export const prepareAddTaskItemDTO = (taskDetails: RawAddTaskDTO): AddTaskItemDTO => {
  const addTaskForm: AddTaskItemDTO = {
    title: taskDetails.title,
    description: taskDetails.description ?? '',
    endTime: taskDetails.time ? combineDateAndTime(taskDetails.date, taskDetails.time) : null,
    labelId: taskDetails.labelId ?? 6,
  };
  console.log('addTaskForm:', addTaskForm);
  return addTaskForm;
};

export const prepareEditTaskItemDTO = (taskEditForm: RawEditTaskDTO): EditTaskItemDTO => {
  const taskEditDetails: EditTaskItemDTO = {
    id: taskEditForm.id,
    title: taskEditForm.title,
    description: taskEditForm.description,
    isDone: taskEditForm.isDone,
    labelId: taskEditForm.labelId,
    endTime: taskEditForm.time ? combineDateAndTime(taskEditForm.date, taskEditForm.time) : null,
  };

  return taskEditDetails;
};
