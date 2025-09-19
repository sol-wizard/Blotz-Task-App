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
          <LinearGradient
            colors={["#A3DC2F", "#2F80ED"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{
              width: 90,
              height: 90,
              borderRadius: 60,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            <Ionicons name="mic-outline" size={35} color="white" />
          </LinearGradient>
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
