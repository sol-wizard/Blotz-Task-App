import { GradientCircle } from "@/shared/components/common/gradient-circle";
import { useVoiceInput } from "@/shared/util/useVoiceInput";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, View, Text, TextInput } from "react-native";
import { ModalType } from "../modals/modal-type";

export const VoiceInput = ({
  text,
  setText,
  sendMessage,
  setModalType,
}: {
  text: string;
  setText: (value: string) => void;
  sendMessage: (v: string) => void;
  setModalType: (v: ModalType) => void;
}) => {
  const { startListening, partialText, stopAndGetText, isListening } = useVoiceInput();
  const displayText = isListening
    ? [text, partialText].filter(Boolean).join(text ? " " : "")
    : text;

  const handleMicPressOut = async () => {
    const spoken = await stopAndGetText();

    let newText = text;
    if (spoken) {
      newText = text?.length ? `${text.trim()} ${spoken}` : spoken;
      setText(newText);
    }

    if (newText?.trim()) {
      sendMessage(newText.trim());
      setModalType("loading");
    }
  };
  return (
    <View className="items-center">
      {isListening && (
        <TextInput
          value={displayText}
          placeholderTextColor="#D1D5DB"
          multiline
          className="text-xl font-bold text-gray-400 text-center"
          style={{ fontFamily: "Baloo2-Regular" }}
        />
      )}
      {!isListening && (
        <>
          <Text className="text-black text-4xl font-balooBold text-center mt-6 leading-snug">
            Braindump tasks{"\n"}with your voice
          </Text>

          <Text className="text-gray-500 font-baloo text-xl text-center mt-2">
            Just say your task, and I‘ll create it automatically
          </Text>
        </>
      )}

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
