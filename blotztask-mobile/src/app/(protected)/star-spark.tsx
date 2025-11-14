import { fetchFloatingTasks } from "@/shared/services/task-service";
import { theme } from "@/shared/constants/theme";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { useState, useEffect } from "react";
import { View, Text, Image, ActivityIndicator, FlatList, Pressable } from "react-native";
import { Searchbar } from "react-native-paper";
import TaskCard from "@/feature/calendar/components/task-card";
import { SafeAreaView } from "react-native-safe-area-context";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { ASSETS } from "@/shared/constants/assets";
import { router } from "expo-router";

export default function StarSparkScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [floatingTasks, setFloatingTasks] = useState<TaskDetailDTO[]>([]);
  const { deleteTask, isDeleting } = useTaskMutations();

  useEffect(() => {
    const loadFloatingTasks = async () => {
      try {
        const tasks = await fetchFloatingTasks();
        setFloatingTasks(tasks);
      } catch (err) {
        console.error("Error fetching floating tasks:", err);
        setFloatingTasks([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadFloatingTasks();
  }, []);

  const renderTask = ({ item }: { item: TaskDetailDTO }) => (
    <TaskCard task={item} deleteTask={deleteTask} isDeleting={isDeleting} />
  );

  return (
    <SafeAreaView className="flex-1 bg-background mt-10">
      <View className="flex-row justify-between items-center">
        <Text className="text-4xl font-bold text-gray-800 font-balooExtraBold pt-4 px-10">
          Star Spark
        </Text>
        <Pressable onPress={() => router.push("/(protected)/gashapon-machine")}>
          <Image source={ASSETS.starIcon} className="w-12 h-12 mr-8"></Image>
        </Pressable>
      </View>

      <View className="bg-[#CDF79A] w-68 h-36 rounded-3xl mx-8 my-6">
        <Text className="font-baloo text-xl text-secondary my-4 ml-4">
          Ready to turn a spark into action?
        </Text>
        <Searchbar
          placeholder=""
          onChangeText={setSearchQuery}
          value={searchQuery}
          iconColor="#D1D1D6"
          style={{
            backgroundColor: theme.colors.surface,
            marginHorizontal: 20,
            borderRadius: 30,
            height: 40,
          }}
        />
      </View>
      {isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" />
        </View>
      )}
      {!isLoading && floatingTasks.length > 0 && (
        <FlatList
          data={floatingTasks}
          renderItem={renderTask}
          keyExtractor={(task) => task.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}
