import { View, Text, Pressable, ActivityIndicator } from "react-native";
import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import { ASSETS } from "@/shared/constants/assets";
import { useTranslation } from "react-i18next";

type Props = {
  isListening: boolean;
  startListening: () => void;
  abortListening: () => void;
  stopListening: () => void;
  isAiGenerating: boolean;
  hasText: boolean;
  onGenerateTask: () => void;
};

const VoiceInputButton = ({
  isListening, 
  startListening,
  abortListening,
  stopListening, 
  isAiGenerating,
  hasText, 
  onGenerateTask,
}: Props) => {
  const { t } = useTranslation("aiTaskGenerate");

  const [seconds, setSeconds] = React.useState(0);

  React.useEffect(() => {
    let interval: any;
    if (isListening) {
      setSeconds(0);
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isListening]);

  const formattedTime = React.useMemo(() => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }, [seconds]);

  if (isAiGenerating) {
    return (
      <View className="mt-4 h-14 w-full rounded-full bg-[#F2F2F2] border border-[#ECECEC] items-center justify-center">
        <ActivityIndicator size="small" color="#2F80ED" />
      </View>
    );
  }

  // Listening State (Gradient Bar)
  if (isListening) {
    return (
      <View
        className="mt-4 h-14 w-full rounded-full"
        style={{
          overflow: "hidden",
        }}
      >
        <LinearGradient
          colors={["#A3DC2F", "#2F80ED"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1, alignItems: "center" }}
        >
          <View className="rounded-full flex-row px-2 items-center flex-1 w-full justify-between">
            <Pressable
              className="rounded-full bg-white h-11 w-11 items-center justify-center"
              onPress={abortListening}
              accessibilityLabel="Cancel recording"
            >
              <MaterialCommunityIcons name="trash-can-outline" size={22} color="#A3DC2F" />
            </Pressable>
            <View className="flex-1 items-center justify-center mx-2">
              <LottieView
                source={ASSETS.voiceWave}
                loop={true}
                autoPlay={true}
                style={{ width: "100%", height: 40 }}
                resizeMode="contain"
              ></LottieView>
            </View>
            <Text
              className="text-white font-bold mr-3"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {formattedTime}
            </Text>
            <Pressable
              className="rounded-full bg-[#F4F4F4] items-center border border-[#ECECEC] justify-center w-20 h-11"
              disabled={isAiGenerating}
              onPress={stopListening}
              accessibilityLabel="Confirm recording"
            >
              <MaterialCommunityIcons name="check-bold" size={22} color="#2F80ED" />
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Has Text -> Show "Generate Task" (Confirm Send)
  if (hasText) {
    return (
      <Pressable
        className="mt-4 h-14 w-full bg-[#F4F4F4] border border-[#ECECEC] rounded-full items-center justify-center flex-row"
        onPress={onGenerateTask}
        accessibilityLabel={t("buttons.generateTask")}
      >
        <Text className="font-bold">{t("buttons.generateTask")}</Text>
      </Pressable>
    );
  }

  // Default: Tap to Speak
  return (
    <Pressable
      className="mt-4 h-14 w-full bg-[#F4F4F4] rounded-full border border-[#ECECEC] items-center flex-row justify-center"
      onPress={startListening}
      accessibilityLabel={t("buttons.tapToSpeak")}
    >
      <MaterialCommunityIcons name="microphone-outline" size={20} color="black" />
      <Text className="font-bold ml-2">{t("buttons.tapToSpeak")}</Text>
    </Pressable>
  );
};

export default VoiceInputButton;
