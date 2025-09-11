import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
  useEffect,
  use,
} from "react";
import { View, Pressable } from "react-native";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Text, ProgressBar } from "react-native-paper";
import { router } from "expo-router";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { CustomCheckbox } from "@/shared/components/ui/custom-checkbox";
import { TaskDetailTag } from "./task-detail-tag";
import { useBottomSheetStore } from "../../store/bottomSheetStore";
import { COLORS } from "@/shared/constants/colors";

type Subtask = any;

export type SubtaskDetailBottomSheetHandle = {
  present: () => void;
  dismiss: () => void;
};

type Props = {
  task?: TaskDetailDTO;
  initialSubtasks?: Subtask[];
  onDismiss?: () => void;
};

const DESIGN_COLOR = COLORS.primary;

function parseTimeSpanToHours(duration?: string | null): number {
  if (!duration) return 0;
  const parts = String(duration).split(":").map(Number);
  if (parts.some(isNaN)) return 0;
  let h = 0,
    m = 0,
    s = 0;
  if (parts.length === 3) [h, m, s] = parts;
  else if (parts.length === 2) [m, s] = parts;
  else if (parts.length === 1) [s] = parts;
  return h + m / 60 + s / 3600;
}

function formatDurationLabel(duration?: string | null): string {
  if (!duration) return "";
  const parts = String(duration).split(":").map(Number);
  if (parts.some(isNaN)) return String(duration);
  let h = 0,
    m = 0,
    s = 0;
  if (parts.length === 3) [h, m, s] = parts;
  else if (parts.length === 2) [m, s] = parts;
  else if (parts.length === 1) [s] = parts;
  const totalMinutes = h * 60 + m + Math.round(s / 60);
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  if (hh && mm) return `${hh}h ${mm}m`;
  if (hh) return `${hh}h`;
  if (mm) return `${mm}m`;
  return "0m";
}

const SubtaskDetailBottomSheet = forwardRef<SubtaskDetailBottomSheetHandle, Props>(
  ({ task, initialSubtasks = [], onDismiss }, ref) => {
    const subtaskDetailModalRef = useRef<BottomSheetModal>(null);
    const [subtasks, setSubtasks] = useState<Subtask[]>(initialSubtasks);
    const { closeTaskDetail } = useBottomSheetStore();

    useEffect(() => {
      setSubtasks(initialSubtasks);
    }, [initialSubtasks]);

    useImperativeHandle(ref, () => ({
      present: () => subtaskDetailModalRef.current?.present(),
      dismiss: () => subtaskDetailModalRef.current?.dismiss(),
    }));

    const snapPoints: (string | number)[] = ["60%", "90%"];

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
          opacity={0.5}
        />
      ),
      [],
    );

    // Count the progress
    const completed = subtasks.filter((s) => s?.isDone).length;
    const total = subtasks.length || 1;
    const progress = completed / total;

    // Get the total hours of the subtasks
    const totalHoursNumber = subtasks.reduce((sum, s) => {
      return sum + parseTimeSpanToHours(s?.duration);
    }, 0);

    const totalHours = Number.isInteger(totalHoursNumber)
      ? `${totalHoursNumber}h`
      : `${totalHoursNumber.toFixed(1)}h`;

    // Toggle subtask completion
    const toggle = (id: number) => {
      setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, isDone: !s.isDone } : s)));
    };

    // Navigate to AI breakdown page
    const handleEditWithAI = () => {
      if (!task) return;
      subtaskDetailModalRef.current?.dismiss();
      closeTaskDetail();
      router.push({
        pathname: "/(protected)/ai-breakdown",
        params: { id: String(task.id) },
      });
    };

    return (
      <BottomSheetModal
        ref={subtaskDetailModalRef}
        snapPoints={snapPoints}
        onDismiss={onDismiss}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
      >
        <BottomSheetView className="flex-1 bg-white px-4 pt-3 pb-28">
          {/* Header */}
          <View className="flex-row items-start justify-between mb-2">
            <Text
              className="flex-1 text-gray-900 mr-3 text-[22px] leading-7"
              style={{ fontWeight: "800" }}
            >
              {task?.title ?? "Subtask Detail"}
            </Text>
            {/* Total hours */}
            <Text style={{ color: DESIGN_COLOR, fontWeight: "800" }} className="text-sm">
              {totalHours}
            </Text>
          </View>

          {/* tags */}
          <View className="flex-row items-center mb-3 gap-2 mt-1">
            <TaskDetailTag>Work</TaskDetailTag>
            <TaskDetailTag>{task?.isDone ? "Done" : "In progress"}</TaskDetailTag>
          </View>

          {/* Progress */}
          <View className="mb-2">
            <Text className="text-[12px] text-neutral-500 font-bold mb-1">
              {completed}/{total} Completed
            </Text>
            {/* Progress bar */}
            <ProgressBar progress={progress} color={DESIGN_COLOR} />
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: DESIGN_COLOR }} className="my-3" />

          {/* Subtasks */}
          <View>
            {subtasks.map((s, i) => {
              const isLast = i === subtasks.length - 1;
              return (
                <View key={s.id} className="relative flex-row items-start py-4">
                  {/* Checkbox */}
                  <CustomCheckbox checked={s.isDone} onPress={() => toggle(s.id)} />

                  {/* Subtask + subtask hours */}
                  <View className="flex-1 ml-2">
                    <View className="flex-row items-center justify-between">
                      <Text
                        className={`text-[15px] ${s?.isDone ? "line-through" : ""}`}
                        style={{ fontWeight: "800", color: s?.isDone ? DESIGN_COLOR : undefined }}
                      >
                        {s?.title ?? "Subtask"}
                      </Text>
                      <Text
                        className="ml-3 text-sm"
                        style={{ color: DESIGN_COLOR, fontWeight: "800" }}
                      >
                        {formatDurationLabel(s?.duration)}
                      </Text>
                    </View>

                    {/* Always show content area, if no content then show placeholder */}
                    <Text
                      className={`mt-1 text-[13px] font-semibold ${s?.isDone ? "line-through" : ""}`}
                      style={{ color: DESIGN_COLOR }}
                    >
                      {s?.description ?? " "}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Navigate to AI button */}
          <View className="absolute left-4 right-4 bottom-6">
            <Pressable
              onPress={handleEditWithAI}
              className="w-full items-center justify-center py-4 rounded-2xl bg-neutral-300 border-neutral-300"
            >
              <Text className="text-base text-white" style={{ fontWeight: "800" }}>
                Edit with AI
              </Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

SubtaskDetailBottomSheet.displayName = "SubtaskDetailBottomSheet";
export default SubtaskDetailBottomSheet;
