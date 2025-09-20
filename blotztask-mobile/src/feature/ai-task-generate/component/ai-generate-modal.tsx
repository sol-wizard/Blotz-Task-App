import { useAiTaskGenerator } from "@/feature/ai-chat-hub/hooks/useAiTaskGenerator";
import { useEffect, useState } from "react";
import { AiTasksPreview } from "./ai-tasks-preview";
import { AiInput } from "./ai-input";
import { Text } from "react-native";

export type ModalType = "input" | "loading" | "task-preview";

export const AiTaskGenerateModal = () => {
  const [text, setText] = useState("");
  const { aiGeneratedTasks, sendMessage } = useAiTaskGenerator();
  const [modalType, setModalType] = useState<ModalType>("input");

  useEffect(() => {
    if (aiGeneratedTasks.length > 0) setModalType("task-preview");
  }, [aiGeneratedTasks.length]);

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
          sendMessage={sendMessage}
          setModalType={setModalType}
        />
      );
  }
};
