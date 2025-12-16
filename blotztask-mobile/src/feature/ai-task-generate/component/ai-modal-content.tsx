/* eslint-disable camelcase */
import { useState } from "react";
import { AiTasksPreview } from "./ai-tasks-preview";
import { AiInput } from "./ai-input";
import { TaskAddedSuccess } from "./task-added-success";
import { useAllLabels } from "@/shared/hooks/useAllLabels";
import { mapExtractedTaskDTOToAiTaskDTO } from "../utils/map-extracted-to-task-dto";
import { BottomSheetType } from "../models/bottom-sheet-type";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";

export const AiModalContent = ({
  modalType,
  setModalType,
  aiGeneratedMessage,
  sendMessage,
  isAiGenerating,
  setAiGeneratedMessage,
}: {
  modalType: BottomSheetType;
  setModalType: (type: BottomSheetType) => void;
  aiGeneratedMessage?: AiResultMessageDTO;
  sendMessage: (text: string) => Promise<void>;
  isAiGenerating: boolean;
  setAiGeneratedMessage: (v?: AiResultMessageDTO) => void;
}) => {
  const [text, setText] = useState("");

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
          setAiGeneratedMessage={setAiGeneratedMessage}
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
          sendMessage={sendMessage}
          isAiGenerating={isAiGenerating || isLoading}
          aiGeneratedMessage={aiGeneratedMessage}
        />
      );
  }
};
