import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LOTTIE_ANIMATIONS } from "@/shared/constants/assets";
import LottieView from "lottie-react-native";
import { View, Pressable, TextInput } from "react-native";
import { useTranslation } from "react-i18next";

type Props = {
  textInput: string;
  isListening: boolean;
  hasResults: boolean;
  onChangeText: (text: string) => void;
  onSubmitText: () => void;
  onMicPressIn: () => void;
  onMicPressOut: () => void;
  onConfirm: () => void;
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
}: Props) {
  const { t } = useTranslation("aiTaskGenerate");

  return (
    <View className="w-full flex-row items-center px-6 gap-4 pb-8">
      {/* Microphone hold-to-record */}
      <Pressable
        onLongPress={onMicPressIn}
        onPressOut={onMicPressOut}
        accessibilityLabel="Hold to record"
        className="w-14 h-14 rounded-full items-center justify-center"
        style={{
          backgroundColor: isListening ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)",
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
            className="w-full text-white font-baloo text-base px-4"
            style={{
              backgroundColor: "rgba(255,255,255,0.25)",
              borderRadius: 28,
              height: 56,
            }}
          />
        )}
      </View>

      {/* Confirm button — only shown when there are AI results to accept */}
      {hasResults && (
        <Pressable
          onPress={onConfirm}
          accessibilityLabel="Confirm"
          className="w-14 h-14 rounded-full items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.25)" }}
        >
          <MaterialCommunityIcons name="check" size={28} color="white" />
        </Pressable>
      )}
    </View>
  );
}
