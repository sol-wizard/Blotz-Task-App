import { View, Text } from "react-native";
import Animated from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { AiResultCard } from "./ai-result-card";
import { AiTaskDTO } from "../models/ai-task-dto";
import { AiNoteDTO } from "../models/ai-result-message-dto";

type Props = {
  aiTasks: AiTaskDTO[];
  aiNotes: AiNoteDTO[];
};

export function AiResultList({ aiTasks, aiNotes }: Props) {
  const { t } = useTranslation("aiTaskGenerate");

  return (
    <Animated.ScrollView className="w-full flex-1" showsVerticalScrollIndicator={false}>
      <View className="items-center">
        {aiTasks.map((task) => (
          <AiResultCard
            key={task.id}
            text={task.title}
            label={task.label}
            startTime={task.startTime}
            endTime={task.endTime}
          />
        ))}
        {aiNotes.length > 0 && (
          <>
            <Text className="text-white/80 font-baloo text-base ml-7 mt-4 mb-2">
              {t("labels.notesSection")}
            </Text>
            {aiNotes.map((note) => (
              <AiResultCard
                key={note.id}
                text={note.text}
              />
            ))}
          </>
        )}
      </View>
    </Animated.ScrollView>
  );
}
