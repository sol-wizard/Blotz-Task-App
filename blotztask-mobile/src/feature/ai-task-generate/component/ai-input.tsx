import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { InputModeSwitch } from "./input-mode-switch";
import { VoiceInput } from "./voice-input";
import { WriteInput } from "./write-input";

export const AiInput = ({
  text,
  setText,
  sheetRef,
  sendMessage,
  isVoiceInput,
  setIsVoiceInput,
  generateTaskError,
  setInputError,
  errorMessage,
}: {
  text: string;
  setText: (v: string) => void;
  sheetRef: React.RefObject<BottomSheetModal | null>;
  sendMessage: (v: string) => void;
  isVoiceInput: boolean;
  setIsVoiceInput: (v: boolean) => void;
  generateTaskError: boolean;
  setInputError: (v: boolean) => void;
  errorMessage?: string;
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
          errorMessage={errorMessage}
        />
      ) : (
        <WriteInput
          text={text}
          setText={setText}
          sendMessage={sendMessage}
          hasError={generateTaskError}
          sheetRef={sheetRef}
          errorMessage={errorMessage}
        />
      )}

      <InputModeSwitch value={isVoiceInput} onChange={setIsVoiceInput} />
    </>
  );
};
