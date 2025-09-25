import { useAiTaskGenerator } from "@/feature/ai-chat-hub/hooks/useAiTaskGenerator";
import { useState } from "react";
import { AiTasksPreview } from "./ai-tasks-preview";
import { AiInput } from "./ai-input";
import { AiThinkingModal } from "./ai-thinking-modal";
import { TaskAddedSuccess } from "./task-added-success";

export const AiTaskGenerateModal = () => {
  const [text, setText] = useState("");
  const { aiGeneratedTasks, sendMessage, modalType, setModalType } = useAiTaskGenerator();

  switch (modalType) {
    case "task-preview":
      return <AiTasksPreview tasks={aiGeneratedTasks} setModalType={setModalType} />;

    case "loading":
      return <AiThinkingModal />;
    case "add-task-success":
      return <TaskAddedSuccess />;

    case "input":
    default:
      return <AiInput text={text} setText={setText} sendMessage={sendMessage} />;
  }
};
