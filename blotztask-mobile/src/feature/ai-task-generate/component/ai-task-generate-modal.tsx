import { useState } from "react";
import { AiTasksPreview } from "./ai-tasks-preview";
import { AiInput } from "./ai-input";
import { AiThinkingModal } from "./ai-thinking-modal";
import { TaskAddedSuccess } from "./task-added-success";
import { useAiTaskGenerator } from "../hooks/useAiTaskGenerator";

export const AiTaskGenerateModal = () => {
  const [text, setText] = useState("");
  const [isVoiceInput, setIsVoiceInput] = useState(true);
  const { aiGeneratedTasks, sendMessage, modalType, setModalType, inputError } =
    useAiTaskGenerator();

  switch (modalType) {
    case "task-preview":
      return (
        <AiTasksPreview
          tasks={aiGeneratedTasks}
          setModalType={setModalType}
          isVoiceInput={isVoiceInput}
          setText={setText}
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
          text={text}
          setText={setText}
          sendMessage={sendMessage}
          isVoiceInput={isVoiceInput}
          setIsVoiceInput={setIsVoiceInput}
        />
      );
  }
};
