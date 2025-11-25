import { theme } from "@/shared/constants/theme";
import { useState } from "react";
import { View, Text, Image, Pressable } from "react-native";
import { Searchbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { ASSETS } from "@/shared/constants/assets";
import { router } from "expo-router";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { FloatingTaskDualView } from "@/feature/star-spark/components/floating-task-dual-view";
import { useFloatingTasks } from "@/feature/star-spark/hooks/useFloatingTasks";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { Snackbar } from "react-native-paper";

export default function StarSparkScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const { floatingTasks, isLoading } = useFloatingTasks();
  const { deleteTask } = useTaskMutations();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");

  const handlePressTask = (task: any) => {
    router.push({
      pathname: "/task-edit",
      params: { taskId: String(task.id) },
    });
  };

  const handleDeleteTask = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteTask(id);
      setSnackbarMsg("Task deleted");
      setSnackbarVisible(true);
    } catch (e) {
      setSnackbarMsg("Failed to delete task");
      setSnackbarVisible(true);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row justify-between items-center mt-10">
        <Text className="text-4xl font-bold text-gray-800 font-balooExtraBold pt-4 px-10">
          Star Spark
        </Text>
        <Pressable onPress={() => router.push("/(protected)/gashapon-machine")}>
          <Image source={ASSETS.starSpark} className="w-12 h-12 mr-8"></Image>
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
          iconColor={theme.colors.disabled}
          style={{
            backgroundColor: theme.colors.background,
            marginHorizontal: 20,
            borderRadius: 30,
            height: 40,
          }}
        />
      </View>

      {isLoading && <LoadingScreen />}
      {!isLoading && floatingTasks && floatingTasks.length > 0 && (
        <FloatingTaskDualView
          tasks={floatingTasks}
          onDeleteTask={handleDeleteTask}
          deletingId={deletingId}
          onPressTask={handlePressTask}
        />
      )}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: "Dismiss",
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMsg}
      </Snackbar>
    </SafeAreaView>
  );
}
