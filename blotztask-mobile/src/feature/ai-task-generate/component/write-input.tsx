import { CustomSpinner } from "@/shared/components/ui/custom-spinner";
import { theme } from "@/shared/constants/theme";
import { View, Keyboard, TextInput } from "react-native";
import { ErrorMessageCard } from "./error-message-card";

export const WriteInput = ({
  text,
  setText,
  sendMessage,
  errorMessage,
  isAiGenerating,
}: {
  text: string;
  setText: (v: string) => void;
  sendMessage: (v: string) => void;
  errorMessage?: string;
  isAiGenerating: boolean;
}) => {
  const sendAndDismiss = (msg: string) => {
    const val = msg.trim();
    if (!val) return;
    sendMessage(val);
    setText(val);
    Keyboard.dismiss();
  };

  const handleChange = (value: string) => {
    setText(value);
    if (value.endsWith("\n")) {
      sendAndDismiss(value);
      return;
    }
  };

  return (
    <View className="mr-6 mt-2">
      <TextInput
        onChangeText={handleChange}
        onSubmitEditing={() => sendAndDismiss(text)}
        returnKeyType="done"
        enablesReturnKeyAutomatically
        placeholder="I have a team meeting scheduled for 9am today...And 10am workout."
        placeholderTextColor={theme.colors.secondary}
        multiline
        className="min-h-[140px] bg-white text-xl text-gray-800 font-baloo"
        style={{ textAlignVertical: "top", marginLeft: 30 }}
      />

      {errorMessage && !isAiGenerating && <ErrorMessageCard errorMessage={errorMessage} />}

      <View
        className={`${isAiGenerating ? "opacity-100" : "opacity-0"} items-center my-6`}
        style={isAiGenerating ? {} : { pointerEvents: "none" }}
      >
        <CustomSpinner size={60} />
      </View>
    </View>
  );
};
