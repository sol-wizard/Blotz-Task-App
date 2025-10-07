import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { InputModeSwitch } from "./input-mode-switch";
import { VoiceInput } from "./voice-input";
import { WriteInput } from "./write-input";

export const AiInput = ({
  sheetRef,
  text,
  setText,
  sendMessage,
  isVoiceInput,
  setIsVoiceInput,
  generateTaskError,
  setInputError,
}: {
  sheetRef: React.RefObject<BottomSheetModal | null>;
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
          sheetRef={sheetRef}
        />
      )}

      <InputModeSwitch value={isVoiceInput} onChange={setIsVoiceInput} />
    </>
  );
};
