import { TextInput, View, Pressable, Text } from "react-native";

export const WriteInput = ({
  text,
  setText,
  sendMessage,
}: {
  text: string;
  setText: (value: string) => void;
  sendMessage: (v: string) => void;
}) => {
  const canSend = text.trim().length > 0;

  const handleConfirm = () => {
    if (!canSend) return;
    sendMessage(text.trim());
    setText("");
  };

  return (
    <View className="w-full px-4 pt-3 pb-6">
      <View className="w-full items-center">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="I have a team meeting scheduled for 9am today...And 10am workout."
          placeholderTextColor="#D1D5DB"
          multiline
          className="w-[92%] min-h-[100px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-lg text-gray-800 font-baloo"
        />
      </View>

      <Pressable
        onPress={handleConfirm}
        disabled={!canSend}
        className={`self-end mt-4 rounded-xl px-5 py-2 border`}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSend }}
      >
        <Text className="font-balooBold">Confirm</Text>
      </Pressable>
    </View>
  );
};
