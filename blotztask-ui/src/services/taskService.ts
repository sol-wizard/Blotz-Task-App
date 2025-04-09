import { TaskDetailDTO } from '@/app/dashboard/task-list/models/task-detail-dto';
import { fetchWithAuth } from '@/utils/fetch-with-auth';
import { AddTaskItemDTO } from '@/model/add-task-item-dto';
import { EditTaskItemDTO } from '@/app/dashboard/task-list/models/edit-task-item-dto';
import { parse, set } from 'date-fns';

export const fetchAllTaskItems = async (): Promise<TaskDetailDTO[]> => {
  const result = await fetchWithAuth<TaskDetailDTO[]>(
    `${process.env.NEXT_PUBLIC_API_BASE_URL_WITH_API}/Task/alltask`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  return result;
};

export const fetchTaskItemsDueToday = async (): Promise<TaskDetailDTO[]> => {
  const startDateUTC = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

  const result = await fetchWithAuth<TaskDetailDTO[]>(
    `${process.env.NEXT_PUBLIC_API_BASE_URL_WITH_API}/Task/due-date?startDateUTC=${encodeURIComponent(startDateUTC)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  return result;
};

export const addTaskItem = async (taskDetails): Promise<TaskDetailDTO> => {
  let dateTime: string;
  if (taskDetails.time != '') {
    const parsedTime = parse(taskDetails.time, 'h:mm a', new Date());
    const hours = parsedTime.getHours();
    const minutes = parsedTime.getMinutes();
    const dateWithTime = set(taskDetails.date, { hours, minutes });
    dateTime = dateWithTime.toISOString();
  }
  const addTaskForm: AddTaskItemDTO = {
    title: taskDetails.title,
    description: taskDetails.description ?? '',
    dueDate: dateTime,
    labelId: taskDetails.labelId ?? 0,
  };
  try {
    const result = await fetchWithAuth<TaskDetailDTO>(
      `${process.env.NEXT_PUBLIC_API_BASE_URL_WITH_API}/Task`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...addTaskForm,
          dueDate: new Date(addTaskForm.dueDate).toISOString(), // Direct conversion
        }),
      }
    );

    return result;
  } catch (error) {
    console.error('Error adding task:', error);
    throw error;
  }
};

export const updateTaskStatus = async (taskId: number): Promise<string> => {
  try {
    const result = await fetchWithAuth<string>(
      `${process.env.NEXT_PUBLIC_API_BASE_URL_WITH_API}/Task/task-completion-status/${taskId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return result;
  } catch (error) {
    console.error('Error completing task:', error);
    return 'Error completing task.';
  }
};

export const editTask = async (taskEditForm: EditTaskItemDTO): Promise<string> => {
  try {
    const result = await fetchWithAuth<string>(
      `${process.env.NEXT_PUBLIC_API_BASE_URL_WITH_API}/Task/${taskEditForm.id}`,
      {
        method: 'PUT',
        body: JSON.stringify(taskEditForm),
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return result;
  } catch (error) {
    console.error('Error editing task:', error);
    throw error;
  }
};

export const deleteTask = async (taskId: number): Promise<string> => {
  try {
    const result = await fetchWithAuth<string>(
      `${process.env.NEXT_PUBLIC_API_BASE_URL_WITH_API}/Task/${taskId}`,
      {
        method: 'DELETE',
      }
    );

    return result;
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

export const undoDeleteTask = async (taskId: number) => {
  try {
    const result = await fetchWithAuth(
      `${process.env.NEXT_PUBLIC_API_BASE_URL_WITH_API}/Task/${taskId}/undo-delete`,
      {
        method: 'POST',
      }
    );
    return result;
  } catch (error) {
    console.error('Error undoing delete:', error);
    return { success: false, message: error.message };
  }
};

export const fetchSearchedTasks = async (query: string): Promise<TaskDetailDTO[]> => {
  const result = await fetchWithAuth<TaskDetailDTO[]>(
    `${process.env.NEXT_PUBLIC_API_BASE_URL_WITH_API}/Task/search?query=${encodeURIComponent(query)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  return result;
};
