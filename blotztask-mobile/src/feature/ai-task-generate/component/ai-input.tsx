import { VoiceTextDisplay } from "./voice-text-display";
import { WriteInput } from "./write-input";

type Props = {
  text: string;
  setText: (value: string) => void;
  isListening: boolean;
  isVoiceInput: boolean;
  displayText: string;
};

export const AiInput = ({ text, setText, isListening, isVoiceInput, displayText }: Props) => {
  return (
    <>
      {isVoiceInput && <VoiceTextDisplay isListening={isListening} displayText={displayText} />}
      {!isVoiceInput && <WriteInput text={text} setText={setText} />}
    </>
  );
};
