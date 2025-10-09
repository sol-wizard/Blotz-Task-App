import { useState } from "react";
import { AiTasksPreview } from "./ai-tasks-preview";
import { AiInput } from "./ai-input";
import { AiThinkingModal } from "./ai-thinking-modal";
import { TaskAddedSuccess } from "./task-added-success";
import { useAiTaskGenerator } from "../hooks/useAiTaskGenerator";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { mapExtractedTaskDTOToAiTaskDTO } from "../utils/map-extracted-to-task-dto";

export const AiTaskGenerateModal = ({
  sheetRef,
}: {
  sheetRef: React.RefObject<BottomSheetModal | null>;
}) => {
  const [isVoiceInput, setIsVoiceInput] = useState(true);
  const { aiGeneratedMessage, sendMessage, modalType, setModalType, inputError, setInputError } =
    useAiTaskGenerator();

  const aiGeneratedTasks = aiGeneratedMessage?.extractedTasks.map(mapExtractedTaskDTOToAiTaskDTO);

  switch (modalType) {
    case "task-preview":
      return (
        <AiTasksPreview
          tasks={aiGeneratedTasks}
          setModalType={setModalType}
          isVoiceInput={isVoiceInput}
        />
      );

    case "loading":
      return <AiThinkingModal />;

    case "add-task-success":
      return <TaskAddedSuccess />;

    case "input":
    default:
      return (
        <AiInput
          generateTaskError={inputError}
          setInputError={setInputError}
          sendMessage={sendMessage}
          isVoiceInput={isVoiceInput}
          setIsVoiceInput={setIsVoiceInput}
          sheetRef={sheetRef}
          errorMessage={aiGeneratedMessage?.errorMessage}
        />
      );
  }
};
