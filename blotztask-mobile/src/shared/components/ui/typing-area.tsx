import { useVoiceInput } from "@/shared/util/useVoiceInput";
import { TextInput, View, Pressable } from "react-native";
import { IconButton } from "react-native-paper";

export const TypingArea = ({
  text,
  setText,
  handleSend,
}: {
  text: string;
  setText: (text: string) => void;
  handleSend: () => void;
}) => {
  const { startListening, stopAndGetText, isListening } = useVoiceInput();

  const handleMicPressOut = async () => {
    const spoken = await stopAndGetText();
    if (spoken) {
      const newText = text?.length ? `${text.trim()} ${spoken}` : spoken;
      setText(newText);
    }
  };

  return (
    <View
      className="flex-row items-end align-top px-3 border-t border-l border-r border-gray-200 bg-white rounded-t-2xl pt-2"
      style={{
        minHeight: 60,
        maxHeight: 150,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      <TextInput
        className="flex-1 text-base text-gray-900 h-full"
        placeholder="Remind me 10 mins before my interview..."
        multiline
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleSend}
        placeholderTextColor="#aaa"
        returnKeyType="send"
      />
      <View className="flex-row justify-end">
        <IconButton icon="send" size={20} onPress={handleSend} />
        <Pressable onLongPress={startListening} onPressOut={handleMicPressOut} delayLongPress={250}>
          <IconButton icon={isListening ? "microphone-outline" : "microphone"} size={20} />
        </Pressable>
      </View>
    </View>
  );
};
