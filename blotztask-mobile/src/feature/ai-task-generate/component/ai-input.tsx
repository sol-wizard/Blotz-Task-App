import { useState } from "react";
import { InputModeSwitch } from "./input-mode-switch";
import { VoiceInput } from "./voice-input";
import { WriteInput } from "./write-input";

export const AiInput = ({
  text,
  setText,
  sendMessage,
}: {
  text: string;
  setText: (value: string) => void;
  sendMessage: (v: string) => void;
}) => {
  const [isVoiceInput, setIsVoiceInput] = useState(true);

  return (
    <>
      {isVoiceInput ? (
        <VoiceInput text={text} setText={setText} sendMessage={sendMessage} />
      ) : (
        <WriteInput text={text} setText={setText} sendMessage={sendMessage} />
      )}

      <InputModeSwitch value={isVoiceInput} onChange={setIsVoiceInput} />
    </>
  );
};
