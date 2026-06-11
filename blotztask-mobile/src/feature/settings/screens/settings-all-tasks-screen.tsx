import React, { useState } from "react";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { ActivityIndicator, FlatList, View, Text, Pressable } from "react-native";
import { TaskStatusRow } from "@/shared/components/task-status-row";

import { TaskListPlaceholder } from "@/feature/calendar/components/tasklist-placeholder";
import { TaskStatusType } from "@/feature/calendar/models/task-status-type";
import { router } from "expo-router";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { filterSelectedTask } from "@/feature/calendar/util/task-counts";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { ReturnButton } from "@/shared/components/return-button";
import { SafeAreaView } from "react-native-safe-area-context";
import TaskCard from "@/feature/calendar/components/task-card";
import { useAllTasksQuery } from "@/feature/settings/hooks/useAllTasksQuery";
import { useSwipeableManager } from "@/feature/notes/hooks/useSwipeableManager";

export default function SettingsAllTasksScreen() {
  const [selectedStatus, setSelectedStatus] = useState<TaskStatusType>("All");

  const { isDeleting, deleteTask } = useTaskMutations();
  const { allTasks, isAllTasksLoading } = useAllTasksQuery();
  const { onRowOpen, closeAllRows } = useSwipeableManager();

  const filteredTaskList = filterSelectedTask({ selectedDayTasks: allTasks });
  const tasksOfSelectedStatus = filteredTaskList.find(
    (item) => item.status === selectedStatus,
  )?.tasks;

  const renderTask = ({ item }: { item: TaskDetailDTO }) => (
    <View className="shadow shadow-gray-300">
      <TaskCard task={item} deleteTask={deleteTask} isDeleting={isDeleting} onRowOpen={onRowOpen} />
    </View>
  );

  return (
    <SafeAreaView className="flex-1">
        <View className="flex-1">
          <View className="flex-row items-center px-5 pt-2">
          <ReturnButton />
          <View className="flex-1 flex-row items-center justify-between">
            <Text className="text-5xl text-gray-800 font-balooExtraBold items-end pt-8">
              All Tasks
            </Text>
            <Pressable
              onPress={() => {
                  closeAllRows();
                  router.push({ pathname: "/(protected)/ddl" });
                }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons name="bell-outline" size={24} color="black" />
            </Pressable>
          </View>
        </View>

        <TaskStatusRow
          allTaskCount={filteredTaskList.find((item) => item.status === "All")?.count ?? 0}
          todoTaskCount={filteredTaskList.find((item) => item.status === "To Do")?.count ?? 0}
          inProgressTaskCount={
            filteredTaskList.find((item) => item.status === "In Progress")?.count ?? 0
          }
          overdueTaskCount={filteredTaskList.find((item) => item.status === "Overdue")?.count ?? 0}
          doneTaskCount={filteredTaskList.find((item) => item.status === "Done")?.count ?? 0}
          selectedStatus={selectedStatus}
          onChange={setSelectedStatus}
        />

        {isAllTasksLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="small" />
          </View>
        ) : tasksOfSelectedStatus && tasksOfSelectedStatus.length > 0 ? (
          <FlatList
            className="flex-1"
            data={tasksOfSelectedStatus}
            renderItem={renderTask}
            keyExtractor={(task) => String(task.id ?? "")}
            contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 8, gap: 12 }}
            onScrollBeginDrag={closeAllRows}
            keyboardShouldPersistTaps="handled"
          />
        ) : (
          <TaskListPlaceholder selectedStatus={selectedStatus} />
        )}
        </View>
    </SafeAreaView>
  );
}
