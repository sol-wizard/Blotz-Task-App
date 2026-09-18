import { View, Text } from "react-native";
import Animated from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { AiResultCard } from "./ai-result-card";
import { AiRecurringResultCard } from "./ai-recurring-result-card";
import { AiResultRow } from "./ai-result-row";
import { useSwipeableManager } from "@/feature/notes/hooks/useSwipeableManager";
import { AiTaskDTO } from "../models/ai-task-dto";
import { AiRecurringTaskDTO } from "../models/ai-recurring-task-dto";
import { AiNoteDTO } from "../models/ai-result-message-dto";

type Props = {
  aiTasks: AiTaskDTO[];
  aiRecurringTasks: AiRecurringTaskDTO[];
  aiNotes: AiNoteDTO[];
  onDeleteTask: (id: string) => void;
  onDeleteRecurring: (id: string) => void;
  onDeleteNote: (id: string) => void;
  isGenerating: boolean;
  /** Size to the cards instead of filling the parent. The parent must cap the height. */
  fitContent?: boolean;
};

export function AiResultList({
  aiTasks,
  aiRecurringTasks,
  aiNotes,
  onDeleteTask,
  onDeleteRecurring,
  onDeleteNote,
  isGenerating,
  fitContent = false,
}: Props) {
  const { t } = useTranslation("aiTaskGenerate");
  const { onRowOpen } = useSwipeableManager();

  return (
    <Animated.ScrollView
      className={fitContent ? "w-full grow-0" : "w-full flex-1"}
      showsVerticalScrollIndicator={false}
    >
      <View className="items-center">
        {aiTasks.map((task) => (
          <AiResultRow
            key={task.id}
            onDelete={() => onDeleteTask(task.id)}
            onRowOpen={onRowOpen}
            enabled={!isGenerating}
          >
            <AiResultCard
              text={task.title}
              label={task.label}
              startTime={task.startTime}
              endTime={task.endTime}
            />
          </AiResultRow>
        ))}
        {aiRecurringTasks.length > 0 && (
          <>
            <Text className="text-white/80 font-baloo text-base ml-7 mt-4 mb-2">
              {t("labels.recurringSection")}
            </Text>
            {aiRecurringTasks.map((task) => (
              <AiResultRow
                key={task.id}
                onDelete={() => onDeleteRecurring(task.id)}
                onRowOpen={onRowOpen}
                enabled={!isGenerating}
              >
                <AiRecurringResultCard
                  title={task.title}
                  label={task.label}
                  scheduleSummary={task.scheduleSummary}
                />
              </AiResultRow>
            ))}
          </>
        )}
        {aiNotes.length > 0 && (
          <>
            <Text className="text-white/80 font-baloo text-base ml-7 mt-4 mb-2">
              {t("labels.notesSection")}
            </Text>
            {aiNotes.map((note) => (
              <AiResultRow
                key={note.id}
                onDelete={() => onDeleteNote(note.id)}
                onRowOpen={onRowOpen}
                enabled={!isGenerating}
              >
                <AiResultCard text={note.text} />
              </AiResultRow>
            ))}
          </>
        )}
      </View>
    </Animated.ScrollView>
  );
}
