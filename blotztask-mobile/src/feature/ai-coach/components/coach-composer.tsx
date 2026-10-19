import { useState } from "react";
import { TextInput, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { useTranslation } from "react-i18next";
import { RoundButton, pressStyle } from "./voice-recording-bar";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  editable: boolean;
  canSend: boolean;
  onSend: () => void;
  onStartVoice: () => void;
};

/** Text pill with one round action beside it: the mic while empty, send once there's text. */
export function CoachComposer({ value, onChangeText, editable, canSend, onSend, onStartVoice }: Props) {
  const { t } = useTranslation("aiCoach");
  const [focused, setFocused] = useState(false);
  const hasText = value.trim().length > 0;

  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-1 h-12 justify-center rounded-full bg-white px-4"
        style={{ borderWidth: focused || hasText ? 1.5 : 1, borderColor: focused || hasText ? "#9AD513" : "#ECEDF0" }}>
        <TextInput
          className="font-baloo text-base text-secondary"
          placeholder={t("chat.inputPlaceholder")}
          placeholderTextColor="#A3A3A3"
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSend}
          returnKeyType="send"
          maxLength={2000}
        />
      </View>

      <RoundButton onPress={hasText ? onSend : onStartVoice} disabled={!canSend}
        label={t(hasText ? "chat.send" : "chat.startVoice")}>
        {(pressed) => (
          <Animated.View
            className={`w-12 h-12 rounded-full items-center justify-center ${hasText ? "bg-secondary" : "bg-highlight"}`}
            style={[pressStyle(pressed), { opacity: canSend ? 1 : 0.5 }]}>
            <Animated.View key={hasText ? "send" : "mic"} entering={FadeIn.duration(150)}>
              <Ionicons name={hasText ? "arrow-up" : "mic"} size={24} color="#FFFFFF" />
            </Animated.View>
          </Animated.View>
        )}
      </RoundButton>
    </View>
  );
}
