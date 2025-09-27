import { useAiTaskGenerator } from "@/feature/ai-chat-hub/hooks/useAiTaskGenerator";
import { useState } from "react";
import { AiTasksPreview } from "./ai-tasks-preview";
import { AiInput } from "./ai-input";
import { AiThinkingModal } from "./ai-thinking-modal";
import { TaskAddedSuccess } from "./task-added-success";
import { VoiceErrorModal } from "./voice-error-modal";
import { WritingErrorModal } from "./writing-error-modal";

export const AiTaskGenerateModal = () => {
  const [text, setText] = useState("");
  const [isVoiceInput, setIsVoiceInput] = useState(true);
  const { aiGeneratedTasks, sendMessage, modalType, setModalType } = useAiTaskGenerator({
    isVoiceInput,
  });

  switch (modalType) {
    case "task-preview":
      return <AiTasksPreview tasks={aiGeneratedTasks} setModalType={setModalType} />;

    case "loading":
      return <AiThinkingModal />;

    case "add-task-success":
      return <TaskAddedSuccess />;

    case "voice-error":
      return <VoiceErrorModal text={text} setText={setText} sendMessage={sendMessage} />;

    case "writing-error":
      return <WritingErrorModal text={text} setText={setText} sendMessage={sendMessage} />;

    case "input":
    default:
      return (
        <AiInput
          text={text}
          setText={setText}
          sendMessage={sendMessage}
          isVoiceInput={isVoiceInput}
          setIsVoiceInput={setIsVoiceInput}
        />
      );
  }
};
