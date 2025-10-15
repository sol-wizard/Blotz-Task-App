import { useState } from "react";
import { AiTasksPreview } from "./ai-tasks-preview";
import { AiInput } from "./ai-input";
import { AiThinkingModal } from "./ai-thinking-modal";
import { TaskAddedSuccess } from "./task-added-success";
import { useAiTaskGenerator } from "../hooks/useAiTaskGenerator";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

export const AiTaskGenerateModal = ({
  sheetRef,
}: {
  sheetRef: React.RefObject<BottomSheetModal | null>;
}) => {
  const [text, setText] = useState("");
  const [isVoiceInput, setIsVoiceInput] = useState(true);
  const { aiGeneratedMessage, sendMessage, modalType, setModalType, inputError, setInputError } =
    useAiTaskGenerator();

  switch (modalType) {
    case "task-preview":
      return (
        <AiTasksPreview
          aiMessage={aiGeneratedMessage}
          setUserInput={setText}
          userInput={text}
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
          text={text}
          setText={setText}
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
