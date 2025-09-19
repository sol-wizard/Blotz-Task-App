import { GradientCircle } from "@/shared/components/common/gradient-circle";
import { useVoiceInput } from "@/shared/util/useVoiceInput";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
    <>
      <View className="items-center">
        <Text className="text-black text-2xl font-bold text-center" style={{ fontFamily: "Baloo" }}>
          Braindump tasks{"\n"}with your voice
        </Text>

        <Text className="text-gray-500 text-base text-center mt-2" style={{ fontFamily: "Baloo2" }}>
          Just say your task, and I‘ll create it automatically
        </Text>
      </View>

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
          <Text className="mt-4 text-gray-500">Recognising...</Text>
        ) : (
          <Text className="mt-4 text-gray-500">Hold and speak</Text>
        )}
      </View>
    </>
  );
};
