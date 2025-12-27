import { GradientCircle } from "@/shared/components/common/gradient-circle";
import { ASSETS } from "@/shared/constants/assets";
import { theme } from "@/shared/constants/theme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";

export const VoiceButton = ({
  isRecognizing,
  toggleListening,
  abortListening: handleAbortListening,
}: {
  isRecognizing: boolean;
  toggleListening: () => Promise<void>;
  abortListening: () => void;
}) => {
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    if (isRecognizing) {
      lottieRef.current?.play();
    } else {
      lottieRef.current?.reset();
    }
  }, [isRecognizing]);

  return (
    <View className="flex-row bg-background rounded-full w-60 items-center justify-center  py-2">
      <Pressable onPress={handleAbortListening}>
        <MaterialCommunityIcons name="close" size={18} color={theme.colors.primary} />
      </Pressable>

      <LottieView
        ref={lottieRef}
        source={ASSETS.voiceBar}
        loop={true}
        autoPlay={false}
        style={{ width: 80, height: 40, marginHorizontal: 20 }}
      />

      <Pressable
        onPress={toggleListening}
        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
      >
        <View className="items-center justify-center">
          <GradientCircle size={40}>
            <Ionicons name="mic-outline" size={23} color="white" />
          </GradientCircle>
        </View>
      </Pressable>
    </View>
  );
};
