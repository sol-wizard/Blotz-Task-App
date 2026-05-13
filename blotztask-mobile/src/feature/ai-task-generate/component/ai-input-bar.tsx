import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LOTTIE_ANIMATIONS } from "@/shared/constants/assets";
import LottieView from "lottie-react-native";
import { View, Pressable, TextInput } from "react-native";
import { useTranslation } from "react-i18next";
import { useRef } from "react";

type Props = {
  // Text input
  textInput: string;
  onChangeText: (text: string) => void;
  onSubmitText: () => void;

  // Mic / recording
  isListening: boolean;
  onShortPress: () => void;
  onMicPressIn: () => void;
  onMicPressOut: () => void;
  cancelListening: () => void;

  isAiGenerating: boolean;
};

export function AiInputBar({
  textInput,
  isListening,
  onChangeText,
  onSubmitText,
  onMicPressIn,
  onMicPressOut,
  onShortPress,
  isAiGenerating,
  cancelListening,
}: Props) {
  const { t } = useTranslation("aiTaskGenerate");
  const longPressTriggered = useRef(false);

  return (
    <View className="flex-1 flex-row items-center gap-4">
      {/* Microphone hold-to-record */}
      <Pressable
        onPressIn={() => {
          if (isAiGenerating) return;
          longPressTriggered.current = false;
          onMicPressIn();
        }}
        onPressOut={() => {
          if (isAiGenerating) return;
          if (!longPressTriggered.current) {
            onShortPress();
            cancelListening();
          } else {
            onMicPressOut();
          }
        }}
        onLongPress={() => {
          if (isAiGenerating) return;
          longPressTriggered.current = true;
        }}
        delayLongPress={1000}
        accessibilityLabel="Hold to record"
        className="w-14 h-14 rounded-full items-center justify-center"
        style={{
          backgroundColor: isListening ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)",
          opacity: isAiGenerating ? 0.4 : 1,
        }}
      >
        <MaterialCommunityIcons name="microphone" size={28} color="white" />
      </Pressable>

      {/* Text input / waveform */}
      <View className="flex-1 items-center justify-center">
        {isListening ? (
          <LottieView
            source={LOTTIE_ANIMATIONS.voiceWave}
            loop
            autoPlay
            style={{ width: "100%", height: 40 }}
            resizeMode="contain"
          />
        ) : (
          <TextInput
            value={textInput}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmitText}
            placeholder={t("input.placeholder")}
            placeholderTextColor="rgba(255,255,255,0.6)"
            returnKeyType="send"
            multiline={false}
            editable={!isAiGenerating}
            className="w-full text-white font-baloo text-base px-4"
            style={{
              backgroundColor: "rgba(255,255,255,0.25)",
              borderRadius: 28,
              height: 56,
              opacity: isAiGenerating ? 0.4 : 1,
            }}
          />
        )}
      </View>

    </View>
  );
}
