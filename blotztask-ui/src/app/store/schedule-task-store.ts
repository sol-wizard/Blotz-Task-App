import { TaskDetailDTO } from '../../model/task-detail-dto';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware'
import {
  addTaskItem,
  deleteTask,
  editTask,
  fetchScheduleTasks,
  undoDeleteTask,
  updateTaskStatus,
} from '@/services/task-service';
import { performTaskAndRefresh } from './shared/util';
import { RawAddTaskDTO } from '@/model/raw-add-task-dto';
import { RawEditTaskDTO } from '@/model/raw-edit-task-dto';

type ScheduleTaskStore = {
  overdueTasks: TaskDetailDTO[];
  todayTasks: TaskDetailDTO[];
  tomorrowTasks: TaskDetailDTO[];
  weekTasks: TaskDetailDTO[];
  monthTasks: Record<number, TaskDetailDTO[]>;
  scheduleTasksIsLoading: boolean;
  actions: {
    loadScheduleTasks: () => Promise<void>;
    setLoading: (value: boolean) => void;
    handleAddTask: (taskDetails: RawAddTaskDTO) => void;
    handleEditTask: (updatedTask: RawEditTaskDTO) => void;
    handleDeleteTask: (taskId: number) => void;
    handleTaskDeleteUndo: (taskId: number) => void;
    handleCheckboxChange: (taskId: number) => void;
  };
};

export const useScheduleTaskStore = create<ScheduleTaskStore>()(subscribeWithSelector((set, get) => ({
  overdueTasks: [],
  todayTasks: [],
  tomorrowTasks: [],
  weekTasks: [],
  monthTasks: {},
  scheduleTasksIsLoading: false,
  actions: {
    setLoading: (value) => set({ scheduleTasksIsLoading: value }),

    loadScheduleTasks: async () => {
      const { setLoading } = get().actions;
      const scheduleTaskStore = await performTaskAndRefresh(
        () => fetchScheduleTasks(),
        async () => {},
        setLoading
      );

      if (scheduleTaskStore) {
        set({ overdueTasks: scheduleTaskStore.overdueTasks });
        set({ todayTasks: scheduleTaskStore.todayTasks });
        set({ tomorrowTasks: scheduleTaskStore.tomorrowTasks });
        set({ weekTasks: scheduleTaskStore.weekTasks });
        set({ monthTasks: scheduleTaskStore.monthTasks });
      }
    },

    handleAddTask: async (taskDetails: RawAddTaskDTO) => {
      const { loadScheduleTasks, setLoading } = get().actions;
      await performTaskAndRefresh(() => addTaskItem(taskDetails), loadScheduleTasks, setLoading);
    },

    handleEditTask: async (updatedTask: RawEditTaskDTO) => {
      const { loadScheduleTasks, setLoading } = get().actions;
      await performTaskAndRefresh(() => editTask(updatedTask), loadScheduleTasks, setLoading);
    },

    handleDeleteTask: async (taskId: number) => {
      const { loadScheduleTasks, setLoading } = get().actions;
      await performTaskAndRefresh(() => deleteTask(taskId), loadScheduleTasks, setLoading);
    },

    handleTaskDeleteUndo: async (taskId: number) => {
      const { loadScheduleTasks, setLoading } = get().actions;
      await performTaskAndRefresh(() => undoDeleteTask(taskId), loadScheduleTasks, setLoading);
    },

    handleCheckboxChange: async (taskId: number) => {
      const { loadScheduleTasks, setLoading } = get().actions;
      await performTaskAndRefresh(() => updateTaskStatus(taskId), loadScheduleTasks, setLoading);
    },
  },
})));

export const useScheduleTaskActions = () => useScheduleTaskStore((state) => state.actions);
