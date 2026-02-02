import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useEffect, useRef, useState } from "react";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";
import { ErrorMessageCard } from "./error-message-card";
import { theme } from "@/shared/constants/theme";
import { AzureSpeechAPI } from "../services/azure-speech-android-apis";
import { useAzureSpeechToken } from "../hooks/useAzureSpeechToken";
import VoiceInputButton from "./voice-input-button";
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
  const { t } = useTranslation(["aiTaskGenerate", "common"]);
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

    const subCanceled = AzureSpeechAPI.onCanceled((err) => {
      console.log("Azure error:", err);
      setIsListening(false);
    });

    return () => {
      subPartial?.remove?.();
      subFinal?.remove?.();
      subCanceled?.remove?.();
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

  const showSendButton = text.trim() !== "" && !isListening;

  return (
    <View className="mb-8">
      <View className="items-center mb-4">
        <View className="w-12 h-1 rounded-full bg-[#ECECEC]" />
      </View>
      <Text className="font-balooBold text-2xl mb-2 px-4 text-secondary">{t("aiTaskGenerate:labels.newTask")}</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t("aiTaskGenerate:input.placeholder")}
        autoFocus
        placeholderTextColor={theme.colors.secondary}
        multiline
        className="font-baloo text-lg text-secondary bg-[#F4F4F4] border border-[#ECECEC] rounded-xl h-40 p-4"
        style={{ textAlignVertical: "top", textAlign: "left" }}
      />
      {aiGeneratedMessage?.errorMessage && (
        <ErrorMessageCard errorMessage={aiGeneratedMessage.errorMessage} />
      )}
      {showSendButton ? (
        isAiGenerating ? (
          <View className="mt-4 h-14 rounded-full bg-[#F4F4F4] border border-[#ECECEC] items-center justify-center">
            <ActivityIndicator size={10} color="#2F80ED" />
          </View>
        ) : (
          <Pressable
            className="bg-[#F4F4F4] border border-[#ECECEC] rounded-full mt-4 p-4 items-center"
            onPress={onPressSend}
          >
            <Text className="font-bold">{t("aiTaskGenerate:buttons.generateTask")}</Text>
          </Pressable>
        )
      ) : (
        <VoiceInputButton
          isListening={isListening}
          startListening={toggleListening}
          abortListening={abortListening}
          sendMessage={stopListening}
          isAiGenerating={isAiGenerating}
        />
      )}
    </View>
  );
};
