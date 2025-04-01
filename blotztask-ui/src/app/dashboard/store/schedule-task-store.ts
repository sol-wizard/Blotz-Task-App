import { TaskDetailDTO } from '../task-list/models/task-detail-dto';
import { create } from 'zustand';

type ScheduleTaskStore = {
  allTasks: TaskDetailDTO[];
  todayTasks: TaskDetailDTO[];
  tomorrowTasks: TaskDetailDTO[];
  weekTasks: TaskDetailDTO[];
  monthTasks: TaskDetailDTO[];
  loadAllTasks: () => Promise<void>;
};

export const useScheduleTaskStore = create<ScheduleTaskStore>((set) => ({
  allTasks: [],
  todayTasks: [],
  tomorrowTasks: [],
  weekTasks: [],
  monthTasks: [],

  loadAllTasks: async () => {
    const mockTaskList: TaskDetailDTO[] = [
      {
        id: 1,
        title: 'Finish TypeScript module',
        description: 'Complete the TypeScript module for the project',
        isDone: false,
        label: { labelId: 7, name: 'Work', color: 'blue' },
        dueDate: new Date('2025-04-10'),
      },
      {
        id: 2,
        title: 'Buy groceries',
        description: 'Get milk, eggs, and vegetables',
        isDone: false,
        label: { labelId: 6, name: 'Personal', color: 'green' },
        dueDate: new Date('2025-04-05'),
      },
      {
        id: 3,
        title: 'Book flight tickets',
        description: 'Book tickets for the business trip next month',
        isDone: true,
        label: { labelId: 8, name: 'Travel', color: 'red' },
        dueDate: new Date('2025-03-30'),
      },
      {
        id: 4,
        title: 'Read a book',
        description: "Finish reading 'Atomic Habits'",
        isDone: false,
        label: { labelId: 7, name: 'Leisure', color: 'yellow' },
        dueDate: new Date('2025-04-15'),
      },
      {
        id: 5,
        title: 'Prepare project presentation',
        description: 'Create slides for the upcoming project presentation',
        isDone: false,
        label: { labelId: 6, name: 'Work', color: 'blue' },
        dueDate: new Date('2025-04-08'),
      },
    ];
    // const data = await fetchAllTaskItems();
    // const today = startOfDay(new Date());
    // const tomorrow = addDays(today, 1);
    // set({ allTasks: data.filter((task) => !task.isDone) });
    set({ allTasks: mockTaskList });
    set({ todayTasks: mockTaskList });
    set({ tomorrowTasks: mockTaskList });
    set({ weekTasks: mockTaskList });
    set({ monthTasks: mockTaskList });
    // const { allTasks } = get();
    // set({ todayTasks: allTasks.filter((task) => isSameDay(new Date(task.dueDate), today)) });
    // set({ tomorrowTasks: allTasks.filter((task) => isSameDay(new Date(task.dueDate), tomorrow)) });
    // set({
    //   weekTasks: allTasks.filter((task) => {
    //     const dueDate = new Date(task.dueDate);
    //     return (
    //       isThisWeek(dueDate, { weekStartsOn: 1 }) &&
    //       !isSameDay(dueDate, today) &&
    //       !isSameDay(dueDate, tomorrow)
    //     );
    //   }),
    // });
    // set({
    //   monthTasks: allTasks.filter((task) => {
    //     const dueDate = new Date(task.dueDate);
    //     return (
    //       isThisMonth(dueDate) &&
    //       !isSameDay(dueDate, today) &&
    //       !isSameDay(dueDate, tomorrow) &&
    //       !isThisWeek(dueDate, { weekStartsOn: 1 })
    //     );
    //   }),
    // });
  },
}));
