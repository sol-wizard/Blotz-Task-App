/* eslint-disable camelcase */
import { useEffect, useState } from "react";
import { AiTasksPreview } from "./ai-tasks-preview";
import { AiInput } from "./ai-input";
import { TaskAddedSuccess } from "./task-added-success";
import { useAiTaskGenerator } from "../hooks/useAiTaskGenerator";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { usePostHog } from "posthog-react-native";
import { useAllLabels } from "@/shared/hooks/useAllLabels";
import { mapExtractedTaskDTOToAiTaskDTO } from "../utils/map-extracted-to-task-dto";

export const AiTaskGenerateModal = ({
  sheetRef,
}: {
  sheetRef: React.RefObject<BottomSheetModal | null>;
}) => {
  const [text, setText] = useState("");
  const [isVoiceInput, setIsVoiceInput] = useState(true);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const { aiGeneratedMessage, sendMessage, modalType, setModalType, inputError, setInputError } =
    useAiTaskGenerator({ setIsAiGenerating });
  const posthog = usePostHog();

  useEffect(() => {
    if (!inputError) {
      posthog.capture("ai_task_interaction_completed", {
        ai_output: JSON.stringify(aiGeneratedMessage),
        user_input: text,
        ai_generate_task_count: 0,
        user_add_task_count: 0,
        outcome: "error",
        is_voice_input: isVoiceInput,
      });
    }
  }, [inputError]);

  const { labels, isLoading } = useAllLabels();

  const aiGeneratedTasks = aiGeneratedMessage?.extractedTasks.map((task) =>
    mapExtractedTaskDTOToAiTaskDTO(task, labels ?? []),
  );

  switch (modalType) {
    case "task-preview":
      return (
        <AiTasksPreview
          aiTasks={aiGeneratedTasks}
          userInput={text}
          setModalType={setModalType}
          isVoiceInput={isVoiceInput}
          sheetRef={sheetRef}
        />
      );

    case "add-task-success":
      return <TaskAddedSuccess />;

    case "input":
    default:
      return (
        <AiInput
          text={text}
          setText={setText}
          generateTaskError={inputError}
          setInputError={setInputError}
          sendMessage={sendMessage}
          isVoiceInput={isVoiceInput}
          setIsVoiceInput={setIsVoiceInput}
          sheetRef={sheetRef}
          errorMessage={aiGeneratedMessage?.errorMessage}
          isAiGenerating={isAiGenerating || isLoading}
        />
      );
  }
};
