import { theme } from "@/shared/constants/theme";
import { useCallback, useEffect, useState } from "react";
import { View, Text, Image, Pressable, useWindowDimensions } from "react-native";
import Svg, { Defs, Mask, Rect } from "react-native-svg";
import { Searchbar } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ASSETS } from "@/shared/constants/assets";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { FloatingTaskDualView } from "@/feature/star-spark/components/floating-task-dual-view";
import { useFloatingTasks } from "@/feature/star-spark/hooks/useFloatingTasks";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useStarSparkSearchEffects } from "@/feature/star-spark/hooks/useStarSparkSearchEffects";
import { router, useFocusEffect } from "expo-router";
import { FloatingTaskDTO } from "@/feature/star-spark/models/floating-task-dto";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { usePostHog } from "posthog-react-native";
import { useTranslation } from "react-i18next";
import { useStarSparkOnboarding } from "@/feature/star-spark/hooks/useStarSparkOnboarding";
import { OnboardingCard } from "@/shared/components/ui/onboarding-card";
import { StarSparkOnboardingOverlay } from "@/feature/star-spark/components/StarSparkOnboardingOverlay";

export default function StarSparkScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const { floatingTasks, isLoading } = useFloatingTasks();
  const { deleteTask, isDeleting } = useTaskMutations();
  const posthog = usePostHog();
  const { t } = useTranslation("starSpark");
  const { width, height } = useWindowDimensions();
  const { isCompleted, setCompleted } = useStarSparkOnboarding();
  const insets = useSafeAreaInsets();
  const [targetLayout, setTargetLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    // 测试用：每次进入页面都重置状态，确保能看到引导
    setCompleted.mutate(false);
  }, []);

  const handleNext = () => {
    // 1. 调用 mutation 将引导状态设为已完成
    setCompleted.mutate(true);
  };

  useFocusEffect(
    useCallback(() => {
      posthog.capture("screen_viewed", {
        screen_name: "StarSpark",
      });
    }, []),
  );

  const { floatingTasksResult, showLoading } = useStarSparkSearchEffects({
    searchQuery,
    floatingTasks,
    isLoadingAll: isLoading,
  });

  const handlePressTask = (task: any) => {
    router.push({
      pathname: "/task-edit",
      params: { taskId: String(task.id) },
    });
  };

  const handleDelete = (task: FloatingTaskDTO) => {
    const taskDetail: TaskDetailDTO = {
      id: task.id,
      title: task.title,
      isDone: task.isDone,
      timeType: 0,
      notificationId: null,
    };
    deleteTask(taskDetail);
  };
  return (
    <View className="flex-1">
      <SafeAreaView edges={["top"]} className="flex-1 bg-background">
        <View className="flex-row justify-between items-center mt-10">
          <Text className="text-4xl text-gray-800 font-balooExtraBold pt-4 px-10">
            {t("title")}
          </Text>
          <Pressable onPress={() => router.push("/(protected)/gashapon-machine")}>
            <Image source={ASSETS.starSpark} className="w-12 h-12 mr-8"></Image>
          </Pressable>
        </View>

        <View
          className="bg-[#CDF79A] mx-8 my-6 rounded-3xl"
          style={{ minHeight: 110, position: "relative", overflow: "hidden" }}
        >
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
            {t("banner")}
          </Text>

          <Searchbar
            value={searchQuery}
            onChangeText={setSearchQuery}
            icon={"magnify"}
            placeholderTextColor={theme.colors.disabled}
            clearIcon={searchQuery ? "close" : undefined}
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
              fontFamily: "BalooRegular",
              paddingBottom: 14,
            }}
          />
        </View>

        {showLoading && <LoadingScreen />}
        {!showLoading && floatingTasksResult.length > 0 && (
          <View style={{ flex: 1, zIndex: 20 }} pointerEvents="box-none">
            <FloatingTaskDualView
              tasks={floatingTasksResult}
              onDeleteTask={handleDelete}
              isDeleting={isDeleting}
              onPressTask={handlePressTask}
              onFirstItemLayout={(layout) => {
                if (!targetLayout) setTargetLayout(layout);
              }}
            />
          </View>
        )}

        {!isCompleted && targetLayout && (
          <StarSparkOnboardingOverlay targetLayout={targetLayout} onNext={handleNext} />
        )}
      </SafeAreaView>
    </View>
  );
}
