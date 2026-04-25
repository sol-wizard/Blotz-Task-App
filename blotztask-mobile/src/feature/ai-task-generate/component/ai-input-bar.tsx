import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LOTTIE_ANIMATIONS } from "@/shared/constants/assets";
import LottieView from "lottie-react-native";
import { View, Pressable, TextInput, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRef } from "react";

type Props = {
  // Text input
  textInput: string;
  onChangeText: (text: string) => void;
  onSubmitText: () => void;

  // Mic / recording
  isListening: boolean;
  setIsHoldHintVisible: (visible: boolean) => void;
  onMicPressIn: () => void;
  onMicPressOut: () => void;
  cancelListening: () => void;

  // Results
  hasResults: boolean;
  onConfirm: () => void;

  isAiGenerating: boolean;
};

export function AiInputBar({
  textInput,
  isListening,
  hasResults,
  onChangeText,
  onSubmitText,
  onMicPressIn,
  onMicPressOut,
  onConfirm,
  setIsHoldHintVisible,
  isAiGenerating,
  cancelListening,
}: Props) {
  const { t } = useTranslation("aiTaskGenerate");
  const { bottom } = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "android" ? bottom + 16 : 32;
  const longPressTriggered = useRef(false);

  return (
    <View
      className="w-full flex-row items-center px-6 gap-4"
      style={{ paddingBottom: bottomPadding }}
    >
      {/* Microphone hold-to-record */}
      <Pressable
        onPressIn={() => {
          if (isAiGenerating) return;
          longPressTriggered.current = false;
          setIsHoldHintVisible(false);
          onMicPressIn();
        }}
        onPressOut={() => {
          if (isAiGenerating) return;
          if (!longPressTriggered.current) {
            setIsHoldHintVisible(true);
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

      {/* Confirm button — only shown when there are AI results to accept */}
      {hasResults && (
        <Pressable
          onPress={isAiGenerating ? undefined : onConfirm}
          accessibilityLabel="Confirm"
          className="w-14 h-14 rounded-full items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.25)", opacity: isAiGenerating ? 0.4 : 1 }}
        >
          <MaterialCommunityIcons name="check" size={28} color="white" />
        </Pressable>
      )}
    </View>
  );
}
