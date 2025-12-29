import { GradientCircle } from "@/shared/components/common/gradient-circle";
import { ASSETS } from "@/shared/constants/assets";
import LottieView from "lottie-react-native";
import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import { Text } from "react-native";
export const VoiceButton = ({
  isRecognizing,
  toggleListening,
  text,
}: {
  text: string;
  isRecognizing: boolean;
  toggleListening: () => Promise<void>;
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
    <Pressable onPress={toggleListening} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
      <GradientCircle width={120} height={40}>
        <View className="flex-row items-center justify-center">
          <LottieView
            ref={lottieRef}
            source={ASSETS.voiceBar}
            loop={true}
            autoPlay={false}
            style={{ width: 50, height: 50 }}
          />
          <Text className="text-white text-m font-bold">Speak</Text>
        </View>
      </GradientCircle>
    </Pressable>
  );
};
