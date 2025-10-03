import { InputModeSwitch } from "./input-mode-switch";
import { VoiceInput } from "./voice-input";
import { WriteInput } from "./write-input";

export const AiInput = ({
  text,
  setText,
  sendMessage,
  isVoiceInput,
  setIsVoiceInput,
  generateTaskError,
  setInputError,
}: {
  text: string;
  setText: (value: string) => void;
  sendMessage: (v: string) => void;
  isVoiceInput: boolean;
  setIsVoiceInput: (v: boolean) => void;
  generateTaskError: boolean;
  setInputError: (v: boolean) => void;
}) => {
  return (
    <>
      {isVoiceInput ? (
        <VoiceInput
          text={text}
          setText={setText}
          sendMessage={sendMessage}
          hasError={generateTaskError}
          setInputError={setInputError}
        />
      ) : (
        <WriteInput
          text={text}
          setText={setText}
          sendMessage={sendMessage}
          hasError={generateTaskError}
        />
      )}

      <InputModeSwitch value={isVoiceInput} onChange={setIsVoiceInput} />
    </>
  );
};
