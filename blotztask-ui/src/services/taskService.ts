import { TaskDetailDTO } from '@/app/dashboard/task-list/models/task-detail-dto';
import { fetchWithAuth } from '@/utils/fetch-with-auth';
import { AddTaskItemDTO } from '@/model/add-task-item-dto';
import { EditTaskItemDTO } from '@/app/dashboard/task-list/models/edit-task-item-dto';

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
  const now = new Date();
  const localDate = now.toLocaleDateString('en-CA');
  const timeOffset = formatTimezoneOffset(-now.getTimezoneOffset());

  function formatTimezoneOffset(offsetMinutes) {
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const hours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, '0');
    const minutes = String(Math.abs(offsetMinutes) % 60).padStart(2, '0');
    return `${sign}${hours}:${minutes}`;
  }

  const result = await fetchWithAuth<TaskDetailDTO[]>(
    `${process.env.NEXT_PUBLIC_API_BASE_URL_WITH_API}/Task/due-date?date=${encodeURIComponent(localDate)}&offset=${timeOffset}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  return result;
};

export const addTaskItem = async (addTaskForm: AddTaskItemDTO): Promise<TaskDetailDTO> => {
  try {
    const result = await fetchWithAuth<TaskDetailDTO>(
      `${process.env.NEXT_PUBLIC_API_BASE_URL_WITH_API}/Task`,
      {
        method: 'POST',
        body: JSON.stringify(addTaskForm),
        headers: {
          'Content-Type': 'application/json',
        },
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
