import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { InputModeSwitch } from "./input-mode-switch";
import { VoiceInput } from "./voice-input";
import { WriteInput } from "./write-input";

export const AiInput = ({
  sheetRef,
  sendMessage,
  isVoiceInput,
  setIsVoiceInput,
  generateTaskError,
  setInputError,
}: {
  sheetRef: React.RefObject<BottomSheetModal | null>;
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
          sendMessage={sendMessage}
          hasError={generateTaskError}
          setInputError={setInputError}
        />
      ) : (
        <WriteInput sendMessage={sendMessage} hasError={generateTaskError} sheetRef={sheetRef} />
      )}

      <InputModeSwitch value={isVoiceInput} onChange={setIsVoiceInput} />
    </>
  );
};
