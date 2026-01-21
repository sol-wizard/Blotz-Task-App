import { View, TextInput, Keyboard } from "react-native";
import { useEffect, useRef, useState } from "react";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";
import { ErrorMessageCard } from "./error-message-card";
import { theme } from "@/shared/constants/theme";
import { AzureSpeechAPI } from "../services/azure-speech-android-apis";
import { useAzureSpeechToken } from "../hooks/useAzureSpeechToken";
import { SendButton } from "./send-button";
import { VoiceButton } from "./voice-button";
import { requestAndroidMicPermission } from "../utils/request-microphone-permission";
import { useUserPreferencesQuery } from "@/feature/settings/hooks/useUserPreferencesQuery";
import { Language } from "@/shared/models/user-preferences-dto";
import { useTranslation } from "react-i18next";

export const AndroidInput = ({
  text,
  setText,
  sendMessage,
  isAiGenerating,
  aiGeneratedMessage,
}: {
  text: string;
  setText: (v: string) => void;
  sendMessage: (v: string) => void;
  isAiGenerating: boolean;
  aiGeneratedMessage?: AiResultMessageDTO;
}) => {
  const { t } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const { tokenItem, isFetchingAzureToken } = useAzureSpeechToken();
  const { userPreferences } = useUserPreferencesQuery();

  const getSttLanguage = () => {
    if (userPreferences?.preferredLanguage === Language.En) return "en-AU";
    if (userPreferences?.preferredLanguage === Language.Zh) return "zh-CN";
    return "en-AU";
  };

  const currentLanguage = getSttLanguage();

  const finalBufferRef = useRef<string>("");

  const mergeDisplayText = (partial: string) => {
    const final = finalBufferRef.current.trim();
    const partialText = (partial ?? "").trim();

    if (!final && !partialText) return "";
    if (final && !partialText) return final;
    if (!final && partialText) return partialText;
    return `${final} ${partialText}`.replace(/\s+/g, " ").trim();
  };

  useEffect(() => {
    requestAndroidMicPermission({
      title: t("common:permissions.microphone.title"),
      message: t("common:permissions.microphone.message"),
      ok: t("common:buttons.ok"),
      cancel: t("common:buttons.cancel"),
    }).then((granted) => {
      if (!granted) {
        console.warn("[Mic] Microphone permission not granted. Voice input will not work.");
      }
    });
  }, [t]);

  useEffect(() => {
    const subPartial = AzureSpeechAPI.onPartial((value) => {
      const v = (value ?? "").trim();
      if (!v) return;

      setText(mergeDisplayText(v));
    });

    const subFinal = AzureSpeechAPI.onFinal?.((value) => {
      const v = (value ?? "").trim();
      if (!v) return;

      finalBufferRef.current = mergeDisplayText(v);
      setText(finalBufferRef.current);
    });

    const subNoMatch = AzureSpeechAPI.onNoMatch?.(() => {
      console.log("Azure no match (silence or unrecognized)");
      setIsListening(false);
    });

    const subCanceled = AzureSpeechAPI.onCanceled((err) => {
      console.log("Azure error:", err);
      setIsListening(false);
    });

    const subDebug = AzureSpeechAPI.onDebug?.((msg) => {
      console.log("[Azure DEBUG]", msg);
    });

    const subStopped = AzureSpeechAPI.onStopped?.((info) => {
      console.log("[Azure STOPPED]", info);
      setIsListening(false);
    });

    const subSessionStopped = AzureSpeechAPI.onSessionStopped?.((info) => {
      console.log("[Azure SessionStopped]", info);
    });

    return () => {
      subPartial?.remove?.();
      subFinal?.remove?.();
      subCanceled?.remove?.();
      subDebug?.remove?.();
      subStopped?.remove?.();
      subSessionStopped?.remove?.();
      subNoMatch?.remove?.();
    };
  }, []);

  const startListening = async () => {
    if (isFetchingAzureToken || !tokenItem) {
      console.log("Azure speech token not ready");
      return;
    }

    finalBufferRef.current = "";
    setText("");

    await AzureSpeechAPI.startListen({
      token: tokenItem.token,
      region: tokenItem.region,
      language: currentLanguage,
    });

    setIsListening(true);
  };

  const stopListening = async () => {
    try {
      await AzureSpeechAPI.stopListen();
    } catch (err) {
      console.error("Error stopping Azure Speech listening:", err);
    }

    setIsListening(false);

    const final = finalBufferRef.current.trim();
    if (final) setText(final);
  };

  const abortListening = () => {
    AzureSpeechAPI.stopListen();
    setIsListening(false);
    finalBufferRef.current = "";
    setText("");
  };

  const sendWriteInput = (msg: string) => {
    const val = msg.trim();
    if (!val) return;
    sendMessage(val);
    Keyboard.dismiss();
    setText("");
    finalBufferRef.current = "";
  };

  const onPressSend = () => {
    if (isListening) stopListening();
    const finalUserText = text.trim();
    if (!finalUserText) return;
    sendMessage(finalUserText);
    finalBufferRef.current = "";
  };

  const toggleListening = async () => {
    if (isListening) {
      stopListening();
      return;
    }
    await startListening();
  };

  return (
    <View className="pt-2">
      <View className="items-center">
        <View className="w-96 mb-10" style={{ minHeight: 60 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            onKeyPress={({ nativeEvent: { key } }) => {
              if (key === "Enter") {
                const cleaned = text.replace(/\n$/, "").trim();
                if (!cleaned) return;
                if (isListening) stopListening();
                sendWriteInput(cleaned);
              }
            }}
            enablesReturnKeyAutomatically
            autoFocus
            placeholder="Hold to speak or tap to write..."
            placeholderTextColor={theme.colors.secondary}
            multiline
            className="w-11/12 bg-white text-xl text-gray-800 font-baloo"
            style={{ textAlignVertical: "top", textAlign: "left" }}
          />

          {aiGeneratedMessage?.errorMessage && (
            <ErrorMessageCard errorMessage={aiGeneratedMessage.errorMessage} />
          )}
        </View>

        <View className="flex-row items-center justify-end mb-6 w-96">
          {text.trim() !== "" || isListening || isAiGenerating ? (
            <SendButton
              text={text}
              isRecognizing={isListening}
              isGenerating={isAiGenerating}
              abortListening={abortListening}
              sendMessage={() => onPressSend()}
              stopListening={stopListening}
            />
          ) : (
            <VoiceButton isRecognizing={isListening} toggleListening={toggleListening} />
          )}
        </View>
      </View>
    </View>
  );
};
