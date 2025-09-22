import { AiTasksPreview } from "./ai-tasks-preview";
import { AiInput } from "./ai-input";
import { Text } from "react-native";
import { ModalType } from "../modals/modal-type";
import { AiTaskDTO } from "@/feature/ai-chat-hub/models/ai-task-dto";

export const AiTaskGenerateModal = ({
  modalType,
  aiGeneratedTasks,
  text,
  setText,
  isListening,
  isVoiceInput,
  displayText,
}: {
  modalType: ModalType;
  aiGeneratedTasks: AiTaskDTO[];
  text: string;
  setText: (v: string) => void;
  isListening: boolean;
  isVoiceInput: boolean;
  displayText: string;
}) => {
  switch (modalType) {
    case "task-preview":
      return (
        <AiTasksPreview
          tasks={aiGeneratedTasks}
          onDeleteTask={(taskId) => console.log("delete task", taskId)}
        />
      );

    case "loading":
      return <Text>AI is thinking ...</Text>;

    case "input":
    default:
      return (
        <AiInput
          text={text}
          setText={setText}
          isListening={isListening}
          isVoiceInput={isVoiceInput}
          displayText={displayText}
        />
      );
  }
};
