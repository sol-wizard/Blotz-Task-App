import { View, Text, Pressable } from "react-native";
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
  sendMessage: () => void;
  isAiGenerating: boolean;
};

const VoiceInputButton = ({
  isListening,
  startListening,
  abortListening,
  sendMessage,
  isAiGenerating,
}: Props) => {
  const { t } = useTranslation("aiTaskGenerate");

  return (
    <View className="mt-4 h-14">
      {!isListening ? (
        <Pressable
          className="bg-[#F2F2F2] rounded-full p-4 items-center flex-row justify-center"
          onPress={startListening}
        >
          <MaterialCommunityIcons name="microphone-outline" size={20} color="black" />
          <Text className="font-bold ml-2">{t("buttons.tapToSpeak")}</Text>
        </Pressable>
      ) : (
        <View
          className="w-full h-full rounded-full"
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
            <View className="rounded-full flex-row px-2 py-1 items-center">
              <Pressable
                className="rounded-full bg-white p-2 items-center justify-center"
                onPress={abortListening}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={22} color="#A3DC2F" />
              </Pressable>
              <View className="flex-1 items-center justify-center">
                <LottieView
                  source={ASSETS.voiceWave}
                  loop={true}
                  autoPlay={true}
                  style={{ width: 200, height: 40 }}
                ></LottieView>
              </View>
              <Pressable
                className="rounded-full bg-white items-center justify-center px-2 w-20 h-10"
                disabled={isAiGenerating}
                onPress={sendMessage}
              >
                <MaterialCommunityIcons name="check-bold" size={22} color="#2F80ED" />
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      )}
    </View>
  );
};

export default VoiceInputButton;
