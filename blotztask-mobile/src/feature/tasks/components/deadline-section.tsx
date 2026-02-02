import { View, FlatList } from "react-native";
import { useDeadlines, DeadlineTask } from "../hooks/useDeadlines";
import TaskCard from "./task-card";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { TaskStatusRow } from "@/shared/components/ui/task-status-row";
import { useState, useMemo } from "react";
import { TaskStatusType } from "../models/task-status-type";
import { TaskListPlaceholder } from "./tasklist-placeholder";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { isBefore } from "date-fns";

// Helper functions to determine task status
function isTodo(task: DeadlineTask): boolean {
  if (task.isDone) return false;
  const nowTime = Date.now();
  if (task.endTime && new Date(task.endTime).getTime() <= nowTime) return false;
  if (task.startTime && new Date(task.startTime).getTime() <= nowTime) return false;
  return true;
}

const isInProgress = (task: DeadlineTask) => {
  if (!task.startTime || !task.endTime) return false;
  const start = new Date(task.startTime);
  const end = new Date(task.endTime);
  return !task.isDone && start <= new Date() && end > new Date();
};

const isOverdue = (task: DeadlineTask) => {
  if (!task.endTime) return false;
  return !task.isDone && isBefore(new Date(task.endTime), new Date());
};

export function DeadlineSection() {
  const { deadlines, isLoading } = useDeadlines();
  const { deleteTask, isDeleting } = useTaskMutations();
  const [selectedStatus, setSelectedStatus] = useState<TaskStatusType>("All");

  const { filteredTasks, counts } = useMemo(() => {
    const todoTasks: DeadlineTask[] = [];
    const inProgressTasks: DeadlineTask[] = [];
    const doneTasks: DeadlineTask[] = [];
    const overdueTasks: DeadlineTask[] = [];

    for (const task of deadlines) {
      const isTaskTodo = isTodo(task);
      const isTaskInProgress = isInProgress(task);
      const isTaskDone = task.isDone;
      const isTaskOverdue = isOverdue(task);

      if (isTaskTodo) todoTasks.push(task);
      if (isTaskInProgress) inProgressTasks.push(task);
      if (isTaskDone) doneTasks.push(task);
      if (isTaskOverdue) overdueTasks.push(task);
    }

    const statusMap: Record<TaskStatusType, DeadlineTask[]> = {
      All: deadlines,
      "To Do": todoTasks,
      "In Progress": inProgressTasks,
      Done: doneTasks,
      Overdue: overdueTasks,
    };

    return {
      filteredTasks: statusMap[selectedStatus] || [],
      counts: {
        All: deadlines.length,
        "To Do": todoTasks.length,
        "In Progress": inProgressTasks.length,
        Done: doneTasks.length,
        Overdue: overdueTasks.length,
      },
    };
  }, [deadlines, selectedStatus]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  const renderDeadline = ({ item }: { item: DeadlineTask }) => (
    <View className="shadow shadow-gray-300">
      <TaskCard
        task={item}
        deleteTask={deleteTask}
        isDeleting={isDeleting}
        selectedDay={new Date()}
      />
    </View>
  );

  return (
    <Animated.View className="flex-1" layout={MotionAnimations.layout}>
      <Animated.View layout={MotionAnimations.layout}>
        <TaskStatusRow
          allTaskCount={counts.All}
          todoTaskCount={counts["To Do"]}
          inProgressTaskCount={counts["In Progress"]}
          overdueTaskCount={counts.Overdue}
          doneTaskCount={counts.Done}
          selectedStatus={selectedStatus}
          onChange={setSelectedStatus}
        />
      </Animated.View>

      {filteredTasks.length > 0 ? (
        <FlatList
          className="flex-1"
          data={filteredTasks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderDeadline}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <TaskListPlaceholder selectedStatus={selectedStatus} />
      )}
    </Animated.View>
  );
}
