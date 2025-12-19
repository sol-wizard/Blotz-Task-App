import { theme } from "@/shared/constants/theme";
import { useEffect, useState } from "react";
import { View, Text, Image, Pressable } from "react-native";
import { Searchbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { ASSETS } from "@/shared/constants/assets";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { FloatingTaskDualView } from "@/feature/star-spark/components/floating-task-dual-view";
import { useFloatingTasks } from "@/feature/star-spark/hooks/useFloatingTasks";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { Snackbar } from "react-native-paper";
import { useStarSparkSearchEffects } from "@/feature/star-spark/hooks/useStarSparkSearchEffects";
import { router} from "expo-router";



export default function StarSparkScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const { floatingTasks, isLoading } = useFloatingTasks();
  const { deleteTask, isDeleting } = useTaskMutations();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");

  const {
  floatingTasksResult,
  showLoading,
  isSearchError,
  searchError,
} = useStarSparkSearchEffects({
  searchQuery,
  floatingTasks,
  isLoadingAll: isLoading,
  debouncedMs: 300,
});


useEffect(() => {
  if (isSearchError) {
    setSnackbarMsg((searchError as any)?.message ?? "Failed to search tasks");
    setSnackbarVisible(true);
  }
}, [isSearchError, searchError]);


  const handlePressTask = (task: any) => {
    router.push({
      pathname: "/task-edit",
      params: { taskId: String(task.id) },
    });
  };

  const handleDeleteTask = async (id: number) => {
    try {
      await deleteTask(id); 
      setSnackbarMsg("Task deleted");
      setSnackbarVisible(true);
    } catch {
      setSnackbarMsg("Failed to delete task");
      setSnackbarVisible(true);
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

      <View className="bg-[#CDF79A] mx-8 my-6 rounded-3xl"
      style={{ minHeight: 110, position: "relative",
    overflow: "hidden", }}>
      <Image
        source={ASSETS.transparentStar}
        style={{
          position: "absolute",
          top: 5,
          right: -5,
          width: 100,
          height: 100,
          opacity: 1,
        }}
      />
        <Text className="font-baloo text-xl text-secondary mt-5 mb-4 mx-4 text-onSurface">
          Ready to turn a spark into action?
        </Text>
        
        <Searchbar
          value={searchQuery}
          onChangeText={setSearchQuery}
          icon={'magnify'}
          placeholderTextColor={theme.colors.disabled}
          clearIcon={searchQuery ? 'close' : undefined}
          iconColor={theme.colors.disabled}
          style={{
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
            height: 40,
            marginHorizontal: 12,
          }}
          inputStyle={{ 
            fontSize: 16,
            fontFamily: 'BalooRegular',
            paddingBottom: 14,
           }}
        />
      </View>

      {showLoading && <LoadingScreen />}
      {!showLoading && floatingTasksResult.length > 0 && (
        <FloatingTaskDualView
          tasks={floatingTasksResult}
          onDeleteTask={handleDeleteTask}
          isDeleting={isDeleting}
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
