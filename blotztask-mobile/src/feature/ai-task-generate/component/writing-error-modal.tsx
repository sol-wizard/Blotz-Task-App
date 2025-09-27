import { theme } from "@/shared/constants/theme";
import { View, Text, TextInput } from "react-native";
import { InputModeSwitch } from "./input-mode-switch";
import { VoiceInput } from "./voice-input";

export const WritingErrorModal = ({
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
  const handleChange = (value: string) => {
    if (value.endsWith("\n")) {
      const msg = value.trim();
      if (msg.length > 0) {
        sendMessage(msg);
      }
      return;
    }
    setText(value);
  };
  return (
    <View className="w-full px-4 pt-3 pb-6">
      {isVoiceInput ? (
        <VoiceInput text={text} setText={setText} sendMessage={sendMessage} />
      ) : (
        <View className="items-center mb-4">
          <TextInput
            value={text}
            onChangeText={handleChange}
            onSubmitEditing={() => {
              const msg = text.trim();
              if (msg) {
                sendMessage(msg);
                setText("");
              }
            }}
            returnKeyType="send"
            placeholder="I have a team meeting scheduled for 9am today...And 10am workout."
            placeholderTextColor={theme.colors.secondary}
            multiline
            className="w-full min-h-[100px] rounded-xl bg-white px-3 mt-4 text-xl text-gray-800 font-baloo text-left"
            style={{ textAlignVertical: "top" }}
          />
          <View className="bg-background w-80 rounded-2xl px-4 py-6 mb-4">
            <Text className="text-[#3D8DE0] text-2xl font-balooBold pt-2">
              Try again-be specific, like ‘Team meeting at 9am‘
            </Text>
          </View>
        </View>
      )}

      <InputModeSwitch value={isVoiceInput} onChange={setIsVoiceInput} />
    </View>
  );
};
