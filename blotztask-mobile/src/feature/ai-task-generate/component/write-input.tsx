import { CustomSpinner } from "@/shared/components/ui/custom-spinner";
import { theme } from "@/shared/constants/theme";
import { View, Keyboard, TextInput } from "react-native";
import { ErrorMessageCard } from "./error-message-card";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";

export const WriteInput = ({
  text,
  setText,
  sendMessage,
  errorMessage,
  isAiGenerating,
  setAiGeneratedMessage,
}: {
  text: string;
  setText: (v: string) => void;
  sendMessage: (v: string) => void;
  errorMessage?: string;
  isAiGenerating: boolean;
  setAiGeneratedMessage: (v?: AiResultMessageDTO) => void;
}) => {
  const sendAndDismiss = (msg: string) => {
    const val = msg.trim();
    if (!val) return;
    sendMessage(val);
    setText(val);
    Keyboard.dismiss();
  };

  return (
    <View className="mt-2 items-center w-full">
      <TextInput
        onChangeText={(v: string) => setText(v)}
        onKeyPress={({ nativeEvent: { key } }) => {
          if (key === "Enter") {
            const cleaned = text.replace(/\n$/, "").trim();
            if (!cleaned) return;
            setAiGeneratedMessage();
            sendAndDismiss(cleaned);
          }
        }}
        enablesReturnKeyAutomatically
        placeholder="I have a team meeting scheduled for 9am today...And 10am workout."
        placeholderTextColor={theme.colors.secondary}
        multiline
        className="min-h-[140px] w-11/12 max-w-[360px] bg-white text-2xl text-gray-800 font-baloo"
        style={{ textAlignVertical: "top", textAlign: "left" }}
      />

      {errorMessage && !isAiGenerating && <ErrorMessageCard errorMessage={errorMessage} />}
      {!errorMessage && (
        <View
          className={`${isAiGenerating ? "opacity-100" : "opacity-0"} items-center my-6`}
          style={isAiGenerating ? {} : { pointerEvents: "none" }}
        >
          <CustomSpinner size={60} />
        </View>
      )}
    </View>
  );
};
