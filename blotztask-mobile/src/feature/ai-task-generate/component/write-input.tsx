import { theme } from "@/shared/constants/theme";
import { TextInput, View } from "react-native";

export const WriteInput = ({
  text,
  setText,
  sendMessage,
}: {
  text: string;
  setText: (value: string) => void;
  sendMessage: (v: string) => void;
}) => {
  const handleChange = (value: string) => {
    if (value.endsWith("\n")) {
      const msg = value.trim();
      if (msg.length > 0) {
        sendMessage(msg);
      }
      setText("");
      return;
    }
    setText(value);
  };

  return (
    <View className="w-full px-4 pt-3 pb-6">
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
        className="w-full min-h-[100px] rounded-xl bg-white px-3 py-4 mt-4 text-xl text-gray-800 font-baloo text-left"
        style={{ textAlignVertical: "top" }}
      />
    </View>
  );
};
