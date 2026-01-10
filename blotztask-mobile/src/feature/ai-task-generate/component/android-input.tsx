import { View, TextInput, Keyboard } from "react-native";
import { useEffect, useRef, useState } from "react";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";
import { ErrorMessageCard } from "./error-message-card";
import { theme } from "@/shared/constants/theme";
import { AzureSpeechAPI } from "../services/azure-speech-android-apis";
import { useAzureSpeechToken } from "../hooks/useAzureSpeechToken";
import { AiLanguagePicker } from "./ai-language-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SendButton } from "./send-button";
import { VoiceButton } from "./voice-button";

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
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);

  const { tokenItem, isFetchingAzureToken } = useAzureSpeechToken();

  const [language, setLanguage] = useState<"en-US" | "zh-CN">(() => {
    AsyncStorage.getItem("ai_language_preference").then((saved: string | null) => {
      if (saved === "en-US" || saved === "zh-CN") setLanguage(saved);
    });
    return "zh-CN";
  });

  // ✅ 只用一个 text：用 baseIndex 记录“这次语音从 text 的哪里开始写”
  const baseIndexRef = useRef<number>(0);
  const lastFinalRef = useRef<string>("");
  const lastPartialRef = useRef<string>("");

  // 为了避免闭包拿到旧 text，这里用 ref 同步最新 text
  const textRef = useRef(text);
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  const applyPartial = (partial: string) => {
    const base = baseIndexRef.current;
    const prefix = textRef.current.slice(0, base);
    const combined = prefix + partial;
    textRef.current = combined; // 同步，避免下一次 partial 用旧值
    setText(combined);
  };

  const commitFinal = (finalText: string) => {
    const base = baseIndexRef.current;
    const prefix = textRef.current.slice(0, base);
    const sep = prefix && !prefix.endsWith(" ") ? " " : "";
    const combined = `${prefix}${finalText}${sep}`;

    textRef.current = combined;
    setText(combined);

    baseIndexRef.current = combined.length;
    lastPartialRef.current = "";
  };

  useEffect(() => {
    const subs = [
      AzureSpeechAPI.onPartial((value) => {
        if (!isListeningRef.current) return;

        const v = (value ?? "").trimStart();
        if (!v) return;

        if (v === lastPartialRef.current) return;
        lastPartialRef.current = v;

        applyPartial(v);
      }),

      AzureSpeechAPI.onFinal((value) => {
        if (!isListeningRef.current) return;

        const v = (value ?? "").trim();
        if (!v) return;

        if (v === lastFinalRef.current) return;
        lastFinalRef.current = v;

        commitFinal(v);
      }),

      AzureSpeechAPI.onCanceled((err) => {
        console.log("Azure error:", err);
        // canceled：不清掉之前内容，只把“当前 partial 覆盖回 prefix”
        const base = baseIndexRef.current;
        const prefix = textRef.current.slice(0, base);
        textRef.current = prefix;
        setText(prefix);

        lastPartialRef.current = "";
      }),
    ];

    return () => {
      subs.forEach((sub) => sub.remove());
    };
  }, []);

  const handleSelectLanguage = async (lang: "en-US" | "zh-CN") => {
    setLanguage(lang);
    try {
      await AsyncStorage.setItem("ai_language_preference", lang);
    } catch (error) {
      console.error("Failed to save AI language preference:", error);
    }
  };

  const toggleListening = async () => {
    if (isListening) {
      AzureSpeechAPI.stopListen();
      setIsListening(false);
      isListeningRef.current = false;

      // stop：把 partial 回滚到 prefix
      const base = baseIndexRef.current;
      const prefix = textRef.current.slice(0, base);
      textRef.current = prefix;
      setText(prefix);

      lastPartialRef.current = "";
      return;
    }

    if (isFetchingAzureToken || !tokenItem) {
      console.log("Azure speech token not ready");
      return;
    }

    // ✅ 语音开始时，记录 baseIndex：partial/最终文本从这里开始写
    baseIndexRef.current = textRef.current.length;
    lastFinalRef.current = "";
    lastPartialRef.current = "";

    AzureSpeechAPI.startListen({
      token: tokenItem.token,
      region: tokenItem.region,
      language,
    });

    setIsListening(true);
    isListeningRef.current = true;
  };

  const stopListening = () => {
    AzureSpeechAPI.stopListen();
    setIsListening(false);
    isListeningRef.current = false;

    // stop：回滚 partial
    const base = baseIndexRef.current;
    const prefix = textRef.current.slice(0, base);
    textRef.current = prefix;
    setText(prefix);

    lastPartialRef.current = "";
  };

  const abortListening = () => {
    AzureSpeechAPI.stopListen();
    setIsListening(false);
    isListeningRef.current = false;

    baseIndexRef.current = 0;
    lastFinalRef.current = "";
    lastPartialRef.current = "";
    textRef.current = "";
    setText("");
  };

  const sendWriteInput = (msg: string) => {
    const val = msg.trim();
    if (!val) return;

    sendMessage(val);
    setText(val);
    Keyboard.dismiss();

    // 发送后清空输入（如果你希望保留就删掉下面几行）
    textRef.current = "";
    setText("");
    baseIndexRef.current = 0;
    lastFinalRef.current = "";
    lastPartialRef.current = "";
  };

  return (
    <View className="pt-2">
      <View className="items-center">
        <View className="w-96 mb-10" style={{ minHeight: 60 }}>
          <TextInput
            value={text}
            onChangeText={(v: string) => {
              // ✅ 用户手动输入时：更新 textRef
              textRef.current = v;
              setText(v);

              // 如果正在 listening，你要决定手打是否打断语音写入：
              // 更稳：更新 baseIndex 到末尾（让 partial 继续拼在后面）
              baseIndexRef.current = v.length;
            }}
            onKeyPress={({ nativeEvent: { key } }) => {
              if (key === "Enter") {
                const cleaned = text.replace(/\n$/, "").trim();
                if (!cleaned) return;
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

        <View className="flex-row items-center justify-between mb-6 w-96">
          <AiLanguagePicker value={language} onChange={handleSelectLanguage} />
          {text.trim() !== "" || isListening ? (
            <SendButton
              text={text}
              isRecognizing={isListening}
              isGenerating={isAiGenerating}
              abortListening={abortListening}
              sendMessage={sendMessage}
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
