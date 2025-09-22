import { View, Text, TextInput } from "react-native";

export const VoiceTextDisplay = ({
  isListening,
  displayText,
}: {
  isListening: boolean;
  displayText: string;
}) => {
  return (
    <View className="items-center">
      {isListening && (
        <TextInput
          value={displayText}
          editable={false}
          placeholderTextColor="#D1D5DB"
          multiline
          className="text-xl font-bold text-gray-400 text-center"
          style={{ fontFamily: "Baloo2-Regular" }}
        />
      )}
      {!isListening && (
        <>
          <Text className="text-black text-4xl font-balooBold text-center leading-snug">
            Braindump tasks{"\n"}with your voice
          </Text>

          <Text className="text-gray-500 font-baloo text-xl text-center mt-2">
            Just say your task, and I‘ll create it automatically
          </Text>
        </>
      )}
    </View>
  );
};
