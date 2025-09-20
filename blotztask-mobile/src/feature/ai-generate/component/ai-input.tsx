import { useState } from "react";
import { InputModeSwitch } from "./input-mode-switch";
import { VoiceInput } from "./voice-input";
import { WriteInput } from "./write-input";
import { ModalType } from "./ai-generate-modal";

export const AiInput = ({
  text,
  setText,
  sendMessage,
  setModalType,
}: {
  text: string;
  setText: (value: string) => void;
  sendMessage: (v: string) => void;
  setModalType: (v: ModalType) => void;
}) => {
  const [isVoiceInput, setIsVoiceInput] = useState(true);
  return (
    <>
      {isVoiceInput && (
        <VoiceInput
          text={text}
          setText={setText}
          sendMessage={sendMessage}
          setModalType={setModalType}
        />
      )}
      {!isVoiceInput && <WriteInput text={text} setText={setText} />}

      <InputModeSwitch value={isVoiceInput} onChange={setIsVoiceInput} />
    </>
  );
};
