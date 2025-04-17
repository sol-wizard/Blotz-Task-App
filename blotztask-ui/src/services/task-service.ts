import { TaskDetailDTO } from '@/model/task-detail-dto';
import { fetchWithAuth } from '@/utils/fetch-with-auth';
import { RawEditTaskDTO } from '@/model/raw-edit-task-dto';
import { mapRawAddTaskDTOtoAddTaskItemDTO, mapRawEditTaskDTOtoAddTaskItemDTO } from './util/util';
import { RawAddTaskDTO } from '@/model/raw-add-task-dto';
import { ScheduledTasksDTO } from '@/model/scheduled-tasks-dto';

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

export const addTaskItem = async (taskDetails: RawAddTaskDTO): Promise<TaskDetailDTO> => {
  const addTaskForm = mapRawAddTaskDTOtoAddTaskItemDTO(taskDetails);
  const localDate = new Date(addTaskForm.dueDate); 
  //TODO: Current reset all time to 0, due to the team still investigating how to handle the time zone
  localDate.setHours(0, 0, 0, 0); 
  const utcDate = localDate.toISOString();
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
          dueDate: utcDate, // Direct conversion
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

export const editTask = async (taskEditForm: RawEditTaskDTO): Promise<string> => {
  const taskEditDetails = mapRawEditTaskDTOtoAddTaskItemDTO(taskEditForm);

  try {
    const result = await fetchWithAuth<string>(
      `${process.env.NEXT_PUBLIC_API_BASE_URL_WITH_API}/Task/${taskEditDetails.id}`,
      {
        method: 'PUT',
        body: JSON.stringify(taskEditDetails),
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

export const fetchScheduleTasks = async (): Promise<ScheduledTasksDTO> => {
  try {

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; 
    const todayDate = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const result = await fetchWithAuth<ScheduledTasksDTO>(
      `${process.env.NEXT_PUBLIC_API_BASE_URL_WITH_API}/Task/scheduled-tasks?timeZone=${encodeURIComponent(timeZone)}&todayDate=${encodeURIComponent(todayDate)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return result;
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
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
