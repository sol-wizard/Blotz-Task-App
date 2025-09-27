import { View, Text } from "react-native";

export const VoiceErrorModal = () => {
  return (
    <View>
      <Text className="text-gray-400 p-5">
        Sorry, we couldn't process your voice input. Please try again or switch to text input.
      </Text>
    </View>
  );
};
