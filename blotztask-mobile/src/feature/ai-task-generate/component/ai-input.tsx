import { InputModeSwitch } from "./input-mode-switch";
import { VoiceInput } from "./voice-input";
import { WriteInput } from "./write-input";

export const AiInput = ({
  text,
  setText,
  sendMessage,
  isVoiceInput,
  setIsVoiceInput,
  inputError,
}: {
  text: string;
  setText: (value: string) => void;
  sendMessage: (v: string) => void;
  isVoiceInput: boolean;
  setIsVoiceInput: (v: boolean) => void;
  inputError: boolean;
}) => {
  return (
    <>
      {isVoiceInput ? (
        <VoiceInput text={text} setText={setText} sendMessage={sendMessage} hasError={inputError} />
      ) : (
        <WriteInput text={text} setText={setText} sendMessage={sendMessage} hasError={inputError} />
      )}

      <InputModeSwitch value={isVoiceInput} onChange={setIsVoiceInput} />
    </>
  );
};
