import { View, Text } from "react-native";

export const WritingErrorModal = () => {
  return (
    <View>
      <Text className="text-gray-400 p-5">
        Sorry, we couldn't process your writing input. Please try again or switch to text input.
      </Text>
    </View>
  );
};
