import { InputModeSwitch } from "./input-mode-switch";
import { VoiceInput } from "./voice-input";
import { WriteInput } from "./write-input";

export const AiInput = ({
  text,
  setText,
  sendMessage,
  isVoiceInput,
  setIsVoiceInput,
}: {
  text: string;
  setText: (value: string) => void;
  sendMessage: (v: string) => void;
  isVoiceInput: boolean;
  setIsVoiceInput: (v: boolean) => void;
}) => {
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
