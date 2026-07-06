import { type RefObject, useRef } from "react";
import { Pressable, View, Text } from "react-native";
import Animated, { SharedValue, useAnimatedStyle } from "react-native-reanimated";
import ReanimatedSwipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { AiResultCard } from "./ai-result-card";
import { AiTaskDTO } from "../models/ai-task-dto";
import { AiNoteDTO } from "../models/ai-result-message-dto";
import { useSwipeableManager } from "@/feature/notes/hooks/useSwipeableManager";

type Props = {
  aiTasks: AiTaskDTO[];
  aiNotes: AiNoteDTO[];
  canRejectTasks: boolean;
  onRejectTask: (taskId: string) => void | Promise<void>;
};

export function AiResultList({ aiTasks, aiNotes, canRejectTasks, onRejectTask }: Props) {
  const { t } = useTranslation("aiTaskGenerate");
  const { onRowOpen } = useSwipeableManager();

  return (
    <Animated.ScrollView className="w-full flex-1" showsVerticalScrollIndicator={false}>
      <View className="items-center">
        {aiTasks.map((task) => (
          <AiTaskSwipeRow
            key={task.id}
            task={task}
            disabled={!canRejectTasks}
            onRejectTask={onRejectTask}
            onRowOpen={onRowOpen}
          />
        ))}
        {aiNotes.length > 0 && (
          <>
            <Text className="text-white/80 font-baloo text-base ml-7 mt-4 mb-2">
              {t("labels.notesSection")}
            </Text>
            {aiNotes.map((note) => (
              <AiResultCard key={note.id} text={note.text} />
            ))}
          </>
        )}
      </View>
    </Animated.ScrollView>
  );
}

type AiTaskSwipeRowProps = {
  task: AiTaskDTO;
  disabled: boolean;
  onRejectTask: (taskId: string) => void | Promise<void>;
  onRowOpen: (ref: RefObject<SwipeableMethods | null>) => void;
};

function AiTaskSwipeRow({ task, disabled, onRejectTask, onRowOpen }: AiTaskSwipeRowProps) {
  const swipeRef = useRef<SwipeableMethods | null>(null);

  const handleReject = () => {
    if (disabled) return;
    swipeRef.current?.close();
    void onRejectTask(task.id);
  };

  return (
    <View className="w-[88%]">
      <ReanimatedSwipeable
        ref={swipeRef}
        enabled={!disabled}
        renderRightActions={(progress: SharedValue<number>) => (
          <AiTaskRejectAction progress={progress} disabled={disabled} onReject={handleReject} />
        )}
        rightThreshold={32}
        overshootRight={false}
        friction={2}
        onSwipeableWillOpen={() => {
          onRowOpen(swipeRef);
        }}
      >
        <AiResultCard
          text={task.title}
          label={task.label}
          startTime={task.startTime}
          endTime={task.endTime}
          containerClassName="w-full"
        />
      </ReanimatedSwipeable>
    </View>
  );
}

type AiTaskRejectActionProps = {
  progress: SharedValue<number>;
  disabled: boolean;
  onReject: () => void;
};

function AiTaskRejectAction({ progress, disabled, onReject }: AiTaskRejectActionProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: 80 * (1 - progress.value) }],
  }));

  return (
    <Animated.View className="h-full items-center justify-center pl-3" style={animatedStyle}>
      <Pressable
        onPress={onReject}
        disabled={disabled}
        className={`h-20 w-20 rounded-3xl bg-red-500/10 items-center justify-center ${
          disabled ? "opacity-50" : ""
        }`}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={24} color="#F56767" />
      </Pressable>
    </Animated.View>
  );
}
