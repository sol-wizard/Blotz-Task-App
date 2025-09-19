import { useAiTaskGenerator } from "@/feature/ai-chat-hub/hooks/useAiTaskGenerator";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { VoiceInput } from "./voice-input";
import { TextInput } from "react-native-gesture-handler";
import { AiGeneratedTasks } from "./ai-generated-tasks";
import { InputModeSwitch } from "./input-mode-switch";
import { WriteInput } from "./write-input";

export const AiInput = ({
  showTaskList,
  setShowTaskList,
  setShowConfirmUI,
}: {
  showTaskList: boolean;
  setShowTaskList: (value: boolean) => void;
  setShowConfirmUI: (value: boolean) => void;
}) => {
  const [text, setText] = useState("");
  const { messages, isTyping } = useAiTaskGenerator();
  const [isVoiceInput, setIsVoiceInput] = useState(true);

  useEffect(() => {
    const latest = messages.at(-2);
    const shouldShowAiTasks = !!latest?.isBot && (latest?.tasks?.length ?? 0) > 0;
    setShowTaskList(shouldShowAiTasks);
    console.log("AiVoiceInput messages:", messages);
  }, [messages]);
  return (
    <>
      {isVoiceInput && !isTyping && <VoiceInput text={text} setText={setText} />}
      {!isVoiceInput && !isTyping && <WriteInput text={text} setText={setText} />}
      <InputModeSwitch value={isVoiceInput} onChange={setIsVoiceInput} />

      {isTyping && <Text>Ai is thinking...</Text>}

      {showTaskList && (
        <AiGeneratedTasks
          tasks={messages.at(-2)?.tasks ?? []}
          backToVoiceInput={() => setShowTaskList(false)}
          goToConfirmUI={() => setShowConfirmUI(true)}
        />
      )}
    </>
  );
};
