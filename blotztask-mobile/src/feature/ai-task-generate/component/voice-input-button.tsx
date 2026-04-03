import { View, ActivityIndicator, Pressable } from "react-native";
import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import MaskedView from "@react-native-masked-view/masked-view";
import { Text } from "react-native";

type Props = {
  isAiGenerating: boolean;
  startListening: () => void;
};

const GradientText = ({ children }: { children: string }) => {
  return (
    <MaskedView
      maskElement={
        <Text className="font-bold ml-2 text-lg" style={{ backgroundColor: "transparent" }}>
          {children}
        </Text>
      }
    >
      <LinearGradient
        colors={["#A3DC2F", "#2F80ED"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
      >
        <Text className="font-bold ml-2 text-lg opacity-0">{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
};

const GradiantMicIcon = () => {
  return (
    <MaskedView
      maskElement={<MaterialCommunityIcons name="microphone-outline" size={20} color="black" />}
    >
      <LinearGradient
        colors={["#A3DC2F", "#2F80ED"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ width: 20, height: 20 }}
      />
    </MaskedView>
  );
};

const VoiceInputButton = ({ isAiGenerating, startListening }: Props) => {
  const { t } = useTranslation("aiTaskGenerate");

  if (isAiGenerating) {
    return (
      <View className="mt-4 h-14 w-full rounded-full bg-[#F2F2F2] border border-[#ECECEC] items-center justify-center">
        <ActivityIndicator size="small" color="#2F80ED" />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={["#A3DC2F", "#2F80ED"]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={{
        marginTop: 16,
        height: 54,
        borderRadius: 20,
        padding: 1,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <Pressable
        className="w-full flex-1 bg-[#F5F9FA] items-center justify-center flex-row"
        style={{ borderRadius: 19 }}
        onPress={startListening}
        accessibilityLabel={t("buttons.tapToSpeak")}
      >
        <View className="flex-row items-center">
          <GradiantMicIcon />
          <GradientText>{t("buttons.tapToSpeak")}</GradientText>
        </View>
      </Pressable>
    </LinearGradient>
  );
};

export default VoiceInputButton;
