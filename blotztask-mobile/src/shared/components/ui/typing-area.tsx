import { TextInput, View } from "react-native";
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
  return (
    <View
      className="flex-row items-center align-top px-3 border-t border-l border-r border-gray-200 bg-white rounded-t-2xl"
      style={{
        height: 60,
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
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleSend}
        placeholderTextColor="#aaa"
        returnKeyType="send"
      />
      <IconButton icon="send" size={20} onPress={handleSend} />
      <IconButton icon="microphone" size={20} onPress={() => {}} />
    </View>
  );
};
