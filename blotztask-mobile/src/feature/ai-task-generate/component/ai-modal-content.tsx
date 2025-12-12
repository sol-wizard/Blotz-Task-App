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
}: {
  modalType: BottomSheetType;
  setModalType: (type: BottomSheetType) => void;
  aiGeneratedMessage?: AiResultMessageDTO;
  sendMessage: (text: string) => Promise<void>;
  isAiGenerating: boolean;
}) => {
  const [text, setText] = useState("");
  const [isVoiceInput, setIsVoiceInput] = useState(true);

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
          isVoiceInput={isVoiceInput}
          setIsVoiceInput={setIsVoiceInput}
          isAiGenerating={isAiGenerating || isLoading}
          aiGeneratedMessage={aiGeneratedMessage}
        />
      );
  }
};
