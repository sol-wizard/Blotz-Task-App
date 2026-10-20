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

/** One card holding the text field and its round action: the mic while empty, send once there's text. */
export function CoachComposer({ value, onChangeText, editable, canSend, onSend, onStartVoice }: Props) {
  const { t } = useTranslation("aiCoach");
  const [focused, setFocused] = useState(false);
  const hasText = value.trim().length > 0;

  return (
    <View className="flex-row items-center gap-1.5 rounded-[26px] bg-white py-1.5 pl-[18px] pr-1.5"
      style={{
        borderWidth: 1.5, borderColor: focused || hasText ? "#9AD513" : "transparent",
        boxShadow: "0 4px 16px rgba(68, 73, 100, 0.08)",
      }}>
      <TextInput
        className="flex-1 font-baloo text-base text-secondary"
        style={{ height: 40 }}
        placeholder={t("chat.inputPlaceholder")}
        placeholderTextColor="#8A8F9C"
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onSend}
        returnKeyType="send"
        maxLength={2000}
      />

      <RoundButton onPress={hasText ? onSend : onStartVoice} disabled={!canSend}
        label={t(hasText ? "chat.send" : "chat.startVoice")}>
        {(pressed) => (
          <Animated.View
            className={`w-11 h-11 rounded-full items-center justify-center ${hasText ? "bg-secondary" : "bg-highlight"}`}
            style={[pressStyle(pressed), { opacity: canSend ? 1 : 0.5 }]}>
            <Animated.View key={hasText ? "send" : "mic"} entering={FadeIn.duration(150)}>
              <Ionicons name={hasText ? "arrow-up" : "mic"} size={22} color={hasText ? "#FFFFFF" : "#2F3347"} />
            </Animated.View>
          </Animated.View>
        )}
      </RoundButton>
    </View>
  );
}
