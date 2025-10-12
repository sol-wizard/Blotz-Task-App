import { useState, useEffect } from "react";
import { View, ScrollView, RefreshControl } from "react-native";
import { Text, Button, ActivityIndicator } from "react-native-paper";
import TaskCard from "@/feature/calendar/components/task-card";
import { getAllTasks } from "@/shared/services/task-service";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";

export default function AllTasksScreen() {
  const [tasks, setTasks] = useState<TaskDetailDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setError(null);
      const data = await getAllTasks();
      setTasks(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="p-4 border-b border-gray-200">
        <Text variant="headlineMedium">All Tasks (Temporary)</Text>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {error && (
          <View className="p-4">
            <Text className="text-red-500 mb-2">{error}</Text>
            <Button mode="outlined" onPress={fetchTasks}>
              Retry
            </Button>
          </View>
        )}

        {!error && tasks.length === 0 && (
          <View className="p-4">
            <Text>No tasks yet</Text>
          </View>
        )}

        <View className="p-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id.toString()}
              id={task.id}
              title={task.title}
              startTime={task.startTime}
              endTime={task.endTime}
              isCompleted={task.isDone}
              labelColor={task.label?.color}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
