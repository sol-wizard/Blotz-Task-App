import { theme } from "@/shared/constants/theme";
import { TextInput, View, Text } from "react-native";

export const WriteInput = ({
  hasError,
  text,
  setText,
  sendMessage,
}: {
  hasError: boolean;
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
      return;
    }
    setText(value);
  };

  return (
    <View className="w-full px-4 pt-3 pb-6 items-center">
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
      {hasError && (
        <View className="bg-background w-80 rounded-2xl px-4 py-6 mb-4">
          <Text className="text-[#3D8DE0] text-2xl font-balooBold pt-2">
            Try again-be specific, like ‘Team meeting at 9am‘
          </Text>
        </View>
      )}
    </View>
  );
};
