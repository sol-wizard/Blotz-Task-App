import { EditTaskItemDTO } from '@/model/edit-task-item-dto';
import { RawAddTaskDTO } from '@/model/raw-add-task-dto';
import { RawEditTaskDTO } from '@/model/raw-edit-task-dto';
import { AddTaskItemDTO } from '@/model/add-task-item-dto';
import { parse, set } from 'date-fns';

export const combineDateAndTime = (date: Date, time?: string): { dueDate: string; hasTime: boolean } => {
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

export const prepareAddTaskItemDTO = (taskDetails: RawAddTaskDTO): AddTaskItemDTO => {
  const { dueDate, hasTime } = combineDateAndTime(taskDetails.date, taskDetails.time);

  const addTaskForm: AddTaskItemDTO = {
    title: taskDetails.title,
    description: taskDetails.description ?? '',
    dueDate: dueDate,
    labelId: taskDetails.labelId ?? 6,
    hasTime: hasTime,
  };
  console.log('addTaskForm:', addTaskForm);
  return addTaskForm;
};

export const prepareEditTaskItemDTO = (taskEditForm: RawEditTaskDTO): EditTaskItemDTO => {
  const { dueDate, hasTime } = combineDateAndTime(taskEditForm.date, taskEditForm.time);

  const taskEditDetails: EditTaskItemDTO = {
    id: taskEditForm.id,
    title: taskEditForm.title,
    description: taskEditForm.description,
    isDone: taskEditForm.isDone,
    labelId: taskEditForm.labelId,
    dueDate: dueDate,
    hasTime: hasTime,
  };

  return taskEditDetails;
};
