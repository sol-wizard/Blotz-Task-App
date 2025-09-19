import { GradientCircle } from "@/shared/components/common/gradient-circle";
import { useVoiceInput } from "@/shared/util/useVoiceInput";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, View, Text } from "react-native";

export const VoiceInput = ({
  text,
  setText,
  sendMessage,
}: {
  text: string;
  setText: (value: string) => void;
  sendMessage: (v: string) => void;
}) => {
  const { startListening, stopAndGetText, isListening } = useVoiceInput();

  const handleMicPressOut = async () => {
    const spoken = await stopAndGetText();

    let newText = text;
    if (spoken) {
      newText = text?.length ? `${text.trim()} ${spoken}` : spoken;
      setText(newText);
    }

    if (newText?.trim()) {
      sendMessage(newText.trim());
    }
  };
  return (
    <View className="items-center">
      <Text className="text-black text-4xl font-balooBold text-center mt-6 leading-snug">
        Braindump tasks{"\n"}with your voice
      </Text>

      <Text className="text-gray-500 font-baloo text-xl text-center mt-2">
        Just say your task, and I‘ll create it automatically
      </Text>

      <View className="mt-6">
        <Pressable
          onLongPress={startListening}
          onPressOut={handleMicPressOut}
          delayLongPress={250}
          style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
        >
          <GradientCircle>
            <Ionicons name="mic-outline" size={35} color="white" />
          </GradientCircle>
        </Pressable>
        {isListening ? (
          <Text className="text-lg mt-4 text-gray-500 font-baloo">Recognising...</Text>
        ) : (
          <Text className="text-lg mt-4 text-gray-500 font-baloo">Hold and speak</Text>
        )}
      </View>
    </View>
  );
};
