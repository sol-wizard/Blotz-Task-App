import { useState } from "react";
import { TextInput, useWindowDimensions, View } from "react-native";
import Animated from "react-native-reanimated";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { useTranslation } from "react-i18next";
import { RoundButton, pressStyle } from "./voice-recording-bar";

const COMPACT_HEIGHT = 40;
const LINE_HEIGHT = 24;
const VERTICAL_PADDING = 8;
const MAX_VISIBLE_LINES = 5;

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  editable: boolean;
  canSend: boolean;
  onSend: () => void;
  onStartVoice: () => void;
};

/**
 * One card holding the text field, the mic and the send button. The mic works with text typed too:
 * the typed words and the transcript are sent together as one message. Send waits for text.
 */
export function CoachComposer({ value, onChangeText, editable, canSend, onSend, onStartVoice }: Props) {
  const { t } = useTranslation("aiCoach");
  const { fontScale } = useWindowDimensions();
  const [focused, setFocused] = useState(false);
  const hasText = value.trim().length > 0;
  const sendReady = canSend && hasText;
  const minHeight = Math.max(COMPACT_HEIGHT, Math.ceil(LINE_HEIGHT * fontScale + VERTICAL_PADDING * 2));
  const maxHeight = Math.ceil(LINE_HEIGHT * fontScale * MAX_VISIBLE_LINES + VERTICAL_PADDING * 2);

  return (
    // gap-2 keeps the 4 pt hitSlop of the mic and send buttons from overlapping between them.
    <View className="flex-row items-end gap-2 rounded-[26px] bg-white py-1.5 pl-[18px] pr-1.5"
      style={{
        borderWidth: 1.5, borderColor: focused || hasText ? "#9AD513" : "transparent",
        boxShadow: "0 4px 16px rgba(68, 73, 100, 0.08)",
      }}>
      <TextInput
        className="flex-1 font-baloo text-base text-secondary"
        style={{
          minHeight,
          maxHeight,
          lineHeight: LINE_HEIGHT,
          paddingVertical: VERTICAL_PADDING,
          textAlignVertical: "top",
          includeFontPadding: false,
        }}
        placeholder={t("chat.inputPlaceholder")}
        placeholderTextColor="#8A8F9C"
        value={value}
        onChangeText={onChangeText}
        multiline
        allowFontScaling
        scrollEnabled
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        submitBehavior="newline"
        returnKeyType="default"
        maxLength={2000}
      />

      <RoundButton onPress={onStartVoice} disabled={!canSend} label={t("chat.startVoice")}>
        {(pressed) => (
          <Animated.View className="w-11 h-11 items-center justify-center"
            style={[pressStyle(pressed), { opacity: canSend ? 1 : 0.5 }]}>
            <Ionicons name="mic-outline" size={22} color="#6B7280" />
          </Animated.View>
        )}
      </RoundButton>

      <RoundButton onPress={onSend} disabled={!sendReady} label={t("chat.send")}>
        {(pressed) => (
          <Animated.View className="w-11 h-11 rounded-full bg-highlight items-center justify-center"
            style={[pressStyle(pressed), { opacity: sendReady ? 1 : 0.5 }]}>
            {/* Dark arrow: white on this green is 1.8:1, under the 3:1 icons need (WCAG 1.4.11). */}
            <Ionicons name="arrow-up" size={22} color="#2F3347" />
          </Animated.View>
        )}
      </RoundButton>
    </View>
  );
}
