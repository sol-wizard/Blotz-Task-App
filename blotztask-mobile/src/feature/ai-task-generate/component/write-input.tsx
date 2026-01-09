import {
  View,
  Text,
  TextInput,
  Keyboard,
  Pressable,
  Platform,
  PermissionsAndroid,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";
import { CustomSpinner } from "@/shared/components/ui/custom-spinner";
import { ErrorMessageCard } from "./error-message-card";
import { theme } from "@/shared/constants/theme";
import { addXfIatListener, XfIatApi } from "../services/xfIat";

export const WriteInput = ({
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

  const sendWriteInput = (msg: string) => {
    const val = msg.trim();
    if (!val) return;
    sendMessage(val);
    setText(val);
    Keyboard.dismiss();
  };

  const initedRef = useRef(false);
  const bufferRef = useRef("");

  useEffect(() => {
    // 监听原生事件：打印 + 拼接识别文本
    const sub = addXfIatListener((e) => {
      console.log("[XFYUN EVENT]", e);

      if (e.type === "result") {
        const text = e.text;
        if (text) {
          bufferRef.current += text;
          console.log("[XFYUN TEXT]", bufferRef.current);
        }
      }

      if (e.type === "error") {
        console.warn("[XFYUN ERROR]", (e as any).code, (e as any).message);
        setIsListening(false);
      }

      if (e.type === "end") {
        // 用户停止说话 or stop 后回调
        console.log("[XFYUN END]");
        setIsListening(false);
      }
    });

    return () => sub.remove();
  }, []);

  const ensureInit = async () => {
    if (initedRef.current) return;

    if (Platform.OS === "android") {
      const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (res !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error("Microphone permission not granted");
      }
    }

    const appId = process.env.EXPO_PUBLIC_XFYUN_APPID;
    const apiKey = process.env.EXPO_PUBLIC_XFYUN_API_KEY;
    const apiSecret = process.env.EXPO_PUBLIC_XFYUN_API_SECRET;

    if (!appId || !apiKey || !apiSecret) {
      throw new Error("Missing XFYUN credentials");
    }

    await XfIatApi.initSdk(appId, apiKey, apiSecret);

    // 可选：再 init ASR（幂等）
    await XfIatApi.init();

    initedRef.current = true;
  };

  const handleToggleListening = async () => {
    try {
      if (isListening) {
        console.log("[XFYUN] stop");
        await XfIatApi.stop(false);
        setIsListening(false);
        return;
      }

      console.log("[XFYUN] start");
      await ensureInit();

      // 每次开始前清空 buffer（你也可以不清空，按业务来）
      bufferRef.current = "";

      // 启动听写：参数可按你需要调整
      await XfIatApi.start({
        language: "zh_cn",
        accent: "mandarin",
        vadBos: 4000,
        vadEos: 1500,
        punctuation: 1,
      });

      setIsListening(true);
    } catch (err: any) {
      console.warn("[XFYUN] toggle failed:", err?.message ?? err);
      setIsListening(false);
    }
  };

  return (
    <View className="pt-2">
      <View className="items-center">
        <View className="w-96 mb-10" style={{ minHeight: 60 }}>
          <TextInput
            value={text}
            onChangeText={(v: string) => setText(v)}
            onKeyPress={({ nativeEvent: { key } }) => {
              if (key === "Enter") {
                const cleaned = text.replace(/\n$/, "").trim();
                if (!cleaned) return;
                sendWriteInput(cleaned);
              }
            }}
            enablesReturnKeyAutomatically
            placeholder="What's in your mind?"
            placeholderTextColor={theme.colors.secondary}
            multiline
            className="w-11/12 bg-white text-xl text-gray-800 font-baloo"
            style={{ textAlignVertical: "top", textAlign: "left" }}
          />
          {aiGeneratedMessage?.errorMessage && (
            <ErrorMessageCard errorMessage={aiGeneratedMessage.errorMessage} />
          )}
        </View>
        <Pressable
          onPress={handleToggleListening}
          className="w-32 h-10 rounded-full items-center justify-center bg-[#a6d445]"
        >
          <Text className="text-white font-baloo">{isListening ? "Stop" : "Listen"}</Text>
        </Pressable>

        {isAiGenerating && (
          <View className="flex-row items-center mt-4 mb-8 w-full px-2 justify-center">
            <CustomSpinner size={60} style={{ marginRight: 10 }} />
          </View>
        )}
      </View>
    </View>
  );
};
