import { useAiTaskGenerator } from "@/feature/ai-chat-hub/hooks/useAiTaskGenerator";
import { useState } from "react";
import { Text } from "react-native";
import { VoiceInput } from "./voice-input";
import { InputModeSwitch } from "./input-mode-switch";
import { WriteInput } from "./write-input";
import { AiTasksPreview } from "./ai-tasks-preview";

export const AiInput = () => {
  const [text, setText] = useState("");
  const { aiGeneratedTasks, isTyping, sendMessage } = useAiTaskGenerator();
  const [isVoiceInput, setIsVoiceInput] = useState(true);
  console.log("aiGeneratedTasks:", aiGeneratedTasks);

  return (
    <>
      {aiGeneratedTasks.length === 0 && (
        <>
          {isVoiceInput && !isTyping && (
            <VoiceInput text={text} setText={setText} sendMessage={sendMessage} />
          )}
          {!isVoiceInput && !isTyping && <WriteInput text={text} setText={setText} />}
          {!isTyping && <InputModeSwitch value={isVoiceInput} onChange={setIsVoiceInput} />}

          {isTyping && <Text>Ai is thinking...</Text>}
        </>
      )}

      {aiGeneratedTasks.length > 0 && (
        <AiTasksPreview
          tasks={aiGeneratedTasks}
          onDeleteTask={(taskId) => console.log("delete task", taskId)}
        />
      )}
    </>
  );
};
