import { useAiTaskGenerator } from "@/feature/ai-chat-hub/hooks/useAiTaskGenerator";
import { useState } from "react";
import { AiTasksPreview } from "./ai-tasks-preview";
import { AiInput } from "./ai-input";
import { Text } from "react-native";

export const AiTaskGenerateModal = () => {
  const [text, setText] = useState("");
  const { aiGeneratedTasks, sendMessage, modalType } = useAiTaskGenerator();

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
      return <AiInput text={text} setText={setText} sendMessage={sendMessage} />;
  }
};
