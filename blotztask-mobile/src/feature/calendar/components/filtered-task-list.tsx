import { FlatList, Pressable, View, useWindowDimensions } from "react-native";
import { TaskStatusRow } from "../../../shared/components/ui/task-status-row";
import { TaskListPlaceholder } from "./tasklist-placeholder";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import TaskCard from "./task-card";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { useCallback, useEffect, useRef, useState } from "react";
import { TaskStatusType } from "../models/task-status-type";
import { filterSelectedTask } from "../util/task-counts";
import useSelectedDayTasks from "@/shared/hooks/useSelectedDayTasks";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { OnboardingCard } from "@/shared/components/ui/onboarding-card";
import { getLocalOnboardingStep, setLocalOnboardingStep } from "@/shared/onboarding/local-onboarding";
import { useFocusEffect } from "expo-router";
import { useUserOnboardingStatus } from "@/feature/ai-task-generate/hooks/useUserOnboardingStatus";
import Svg, { Defs, Mask, Rect } from "react-native-svg";

export const FilteredTaskList = ({ selectedDay }: { selectedDay: Date }) => {
  const [selectedStatus, setSelectedStatus] = useState<TaskStatusType>("All");
  const [showStep5, setShowStep5] = useState(false);
  const [hasOpenedSwipeOnce, setHasOpenedSwipeOnce] = useState(false);
  const listRef = useRef<FlatList<TaskDetailDTO> | null>(null);
  const { isUserOnboarded } = useUserOnboardingStatus();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [highlightLayout, setHighlightLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [listContainerLayout, setListContainerLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const { deleteTask, isDeleting } = useTaskMutations();

  const { selectedDayTasks, isLoading } = useSelectedDayTasks({ selectedDay });

  const filteredSelectedDayTasks = filterSelectedTask({
    selectedDayTasks: selectedDayTasks ?? [],
  });
  const safeFilteredTasks = Array.isArray(filteredSelectedDayTasks) ? filteredSelectedDayTasks : [];
  const tasksOfSelectedStatus = safeFilteredTasks.find(
    (item) => item.status === selectedStatus,
  )?.tasks;

  const refreshOnboardingStep = useCallback(() => {
    let mounted = true;
    (async () => {
      const step = await getLocalOnboardingStep();
      if (!mounted) return;
      setShowStep5(isUserOnboarded && step === 5);
      if (!(isUserOnboarded && step === 5)) {
        setHasOpenedSwipeOnce(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isUserOnboarded]);

  useFocusEffect(refreshOnboardingStep);

  useEffect(() => {
    if (!showStep5) return;
    if (!tasksOfSelectedStatus || tasksOfSelectedStatus.length === 0) return;
    listRef.current?.scrollToIndex({ index: 0, animated: true });
  }, [showStep5, tasksOfSelectedStatus]);
  const findStatusCount = (status: TaskStatusType) => {
    return filteredSelectedDayTasks.find((g) => g.status === status)?.count ?? 0;
  };

  const renderTask = ({ item }: { item: TaskDetailDTO }) => (
    <View className="shadow shadow-gray-300">
      <TaskCard
        task={item}
        deleteTask={deleteTask}
        isDeleting={isDeleting}
        selectedDay={selectedDay}
        onSwipeActionsOpen={() => setHasOpenedSwipeOnce(true)}
        onBreakdownPress={async () => {
          await setLocalOnboardingStep("done");
          setShowStep4(false);
        }}
      />
    </View>
  );

  const renderTaskWithHighlight = ({ item, index }: { item: TaskDetailDTO; index: number }) => {
    if (!showStep5 || index !== 0) return renderTask({ item });

    // Measure the first card so we can render a spotlight + interactive overlay copy.
    return (
      <View
        onLayout={(e) => setHighlightLayout(e.nativeEvent.layout)}
        style={{ opacity: 0 }}
        pointerEvents="none"
      >
        {renderTask({ item })}
      </View>
    );
  };

  const highlightAbs =
    showStep5 && highlightLayout && listContainerLayout
      ? {
          x: listContainerLayout.x + highlightLayout.x,
          y: listContainerLayout.y + highlightLayout.y,
          width: highlightLayout.width,
          height: highlightLayout.height,
        }
      : null;

  return (
    <View className="flex-1">
      <View className="flex-1 relative">
        <View pointerEvents={showStep5 ? "none" : "auto"}>
          <TaskStatusRow
            allTaskCount={findStatusCount("All")}
            todoTaskCount={findStatusCount("To Do")}
            inProgressTaskCount={findStatusCount("In Progress")}
            overdueTaskCount={findStatusCount("Overdue")}
            doneTaskCount={findStatusCount("Done")}
            selectedStatus={selectedStatus}
            onChange={setSelectedStatus}
            selectedDay={selectedDay}
          />
        </View>

        {isLoading ? (
          <LoadingScreen />
        ) : tasksOfSelectedStatus && tasksOfSelectedStatus.length > 0 ? (
          <View
            className="flex-1 relative"
            onLayout={(e) => setListContainerLayout(e.nativeEvent.layout)}
          >
            <FlatList
              className="flex-1"
              data={tasksOfSelectedStatus}
              renderItem={renderTaskWithHighlight}
              keyExtractor={(task) => task.id.toString()}
              ref={(ref) => {
                listRef.current = ref;
              }}
              onScrollToIndexFailed={() => {}}
              scrollEnabled={!showStep5}
              pointerEvents={showStep5 ? "none" : "auto"}
            />

            {showStep5 && highlightAbs && tasksOfSelectedStatus?.[0] && (
            <>
                {/* Block all other interactions (list area) */}
                <Pressable
                  className="absolute inset-0"
                  style={{ zIndex: 10 }}
                  onPress={() => {}}
                  android_disableSound
                  accessible={false}
                />

                {/* Spotlight mask (covers whole screen) */}
                <Svg
                  width={windowWidth}
                  height={windowHeight}
                  style={{ position: "absolute", top: -listContainerLayout!.y, left: -listContainerLayout!.x, zIndex: 11 }}
                  pointerEvents="none"
                >
                  <Defs>
                    <Mask id="task-spotlight-mask" maskUnits="userSpaceOnUse">
                      <Rect width={windowWidth} height={windowHeight} fill="white" />
                      <Rect
                        x={highlightAbs.x}
                        y={highlightAbs.y}
                        width={highlightAbs.width}
                        height={highlightAbs.height}
                        rx={24}
                        ry={24}
                        fill="black"
                      />
                    </Mask>
                  </Defs>
                  <Rect
                    width={windowWidth}
                    height={windowHeight}
                    fill="rgba(0,0,0,0.35)"
                    mask="url(#task-spotlight-mask)"
                  />
                </Svg>

                {/* Interactive highlighted card */}
                <View
                  style={{
                    position: "absolute",
                    left: highlightLayout!.x,
                    top: highlightLayout!.y,
                    width: highlightLayout!.width,
                    height: highlightLayout!.height,
                    zIndex: 12,
                  }}
                >
                  <TaskCard
                    task={tasksOfSelectedStatus[0]}
                    deleteTask={deleteTask}
                    isDeleting={isDeleting}
                    selectedDay={selectedDay}
                    onSwipeActionsOpen={() => setHasOpenedSwipeOnce(true)}
                    onBreakdownPress={async () => {
                      await setLocalOnboardingStep("done");
                      setShowStep5(false);
                      setHasOpenedSwipeOnce(false);
                      setHighlightLayout(null);
                      setListContainerLayout(null);
                    }}
                  />
                </View>

                {/* Prompt (prefer below the highlighted card) */}
                <OnboardingCard
                  title={hasOpenedSwipeOnce ? "Tap Breakdown" : "Swipe left on this task"}
                  subtitle={
                    hasOpenedSwipeOnce ? "Then tap to continue" : "Reveal the Breakdown button"
                  }
                  style={{
                    position: "absolute",
                    left: 16,
                    right: 16,
                    top: Math.min(
                      highlightLayout!.y + highlightLayout!.height + 12,
                      listContainerLayout!.height - 140,
                    ),
                    zIndex: 13,
                  }}
                />
            </>
          )}
          </View>
        ) : (
          <TaskListPlaceholder selectedStatus={selectedStatus} />
        )}
      </View>
    </View>
  );
};
