import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useCallback,
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
import { VerticalDashedLine } from "@/shared/components/ui/vertical-dashed-line";
import { COLORS } from "@/shared/constants/colors";

type Subtask = {
  id: number;
  subtask: string;
  estimatedDuration: string; // "1h" | "2h" | "1.5h"
  isCompleted: boolean;
  content?: string;
};

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

// Vertical line positioning constants (can be fine-tuned according to actual UI)
const LEFT_COL_WIDTH = 44;          // Consistent with your checkbox column width
const CHECKBOX_SIZE = 28;           // Visual size of your CustomCheckbox
const LINE_SPACING = 7;             // Spacing between checkbox and dashed line

const SubtaskDetailBottomSheet = forwardRef<
  SubtaskDetailBottomSheetHandle,
  Props
>(({ task, initialSubtasks = [], onDismiss }, ref) => {
  const subtaskDetailModalRef = useRef<BottomSheetModal>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialSubtasks);

  useImperativeHandle(ref, () => ({
    present: () => subtaskDetailModalRef.current?.present(),
    dismiss: () => subtaskDetailModalRef.current?.dismiss(),
  }));

  const snapPoints = useMemo(() => ["60%", "90%"], []);

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
    []
  );

  // Count the progress
  const completed = subtasks.filter((s) => s.isCompleted).length;
  const total = subtasks.length || 1;
  const progress = completed / total;

  // Get the total hours of the subtasks
  const totalHours = useMemo(() => {
    return subtasks.reduce((sum, s) => {
      const n = parseFloat(String(s.estimatedDuration).replace(/[^\d.]/g, ""));
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
  }, [subtasks]);

  const totalHoursLabel =
    Number.isInteger(totalHours) ? `${totalHours}h` : `${totalHours.toFixed(1)}h`;
  
  // Toggle subtask completion
  const toggle = (id: number) => {
    setSubtasks((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, isCompleted: !s.isCompleted } : s
      )
    );
  };

  // Navigate to AI breakdown page
  const handleEditWithAI = () => {
    if (!task) return;
    subtaskDetailModalRef.current?.dismiss();
    router.push({
      pathname: "/(protected)/ai-breakdown",
      params: { id: task.id, title: task.title, description: task.description },
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
            {totalHoursLabel}
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
                <View style={{ width: LEFT_COL_WIDTH, position: "relative" }} className="items-center">
                  <CustomCheckbox checked={s.isCompleted} onPress={() => toggle(s.id)} />

                  {/* Vertical dashed line */}
                  {!isLast && (
                    <View 
                      style={{ 
                        position: 'absolute', 
                        top: CHECKBOX_SIZE + LINE_SPACING,
                        // left: '50%',
                        transform: [{ translateX: -4.5 }]
                      }}
                    >
                      <VerticalDashedLine 
                        height={25} 
                        color={DESIGN_COLOR}
                        width={1}
                        dashLength={3}
                        gapLength={2}
                        style={{ alignSelf: 'center' }}
                      />
                    </View>
                  )}
                </View>

                {/* Subtask + subtask hours */}
                <View className="flex-1 ml-2">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`text-[15px] ${s.isCompleted ? "line-through" : ""}`}
                      style={{ fontWeight: "800", color: s.isCompleted ? DESIGN_COLOR : undefined }}
                    >
                      {s.subtask ? s.subtask : "Subtask"}
                    </Text>
                    <Text
                      className="ml-3 text-sm"
                      style={{ color: DESIGN_COLOR, fontWeight: "800" }}
                    >
                      {s.estimatedDuration}
                    </Text>
                  </View>

                  {/* Always show content area, if no content then show placeholder */}
                  <Text
                    className={`mt-1 text-[13px] font-semibold ${s.isCompleted ? "line-through" : ""}`}
                    style={{ color: DESIGN_COLOR }}
                  >
                    {s.content ? s.content : " "}
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
});

SubtaskDetailBottomSheet.displayName = "SubtaskDetailBottomSheet";
export default SubtaskDetailBottomSheet;
