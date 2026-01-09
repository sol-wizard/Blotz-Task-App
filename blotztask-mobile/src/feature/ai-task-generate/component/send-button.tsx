import { GradientCircle } from "@/shared/components/common/gradient-circle";
import LottieView from "lottie-react-native";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { theme } from "@/shared/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ASSETS } from "@/shared/constants/assets";
export const SendButton = ({
  isRecognizing,
  isGenerating,
  abortListening: handleAbortListening,
  stopListening,
  text,
  sendMessage,
}: {
  text: string;
  isGenerating: boolean;
  isRecognizing: boolean;
  abortListening: () => void;
  stopListening: () => void;
  sendMessage: (message: string) => void;
}) => {
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    if (isRecognizing) {
      lottieRef.current?.play();
    } else {
      lottieRef.current?.reset();
    }
  }, [isRecognizing]);

  const handleSendMessage = () => {
    sendMessage(text);
    stopListening();
  };

  return (
    <View className="flex-row items-center justify-center gap-2">
      <Pressable onPress={handleAbortListening}>
        <View className="w-8 h-8 rounded-full bg-[#f4f8f9] items-center justify-center">
          <MaterialCommunityIcons name="close" size={12} color={theme.colors.primary} />
        </View>
      </Pressable>
      <Pressable
        onPress={handleSendMessage}
        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
      >
        <GradientCircle width={100} height={40}>
          <View className="flex-row items-center justify-center">
            {isGenerating ? (
              <ActivityIndicator size="small" color={"white"} className="mr-4" />
            ) : (
              isRecognizing && (
                <LottieView
                  ref={lottieRef}
                  source={ASSETS.voiceBar}
                  loop={true}
                  autoPlay={false}
                  style={{ width: 40, height: 40 }}
                />
              )
            )}

            <Text className="font-baloo text-white text-lg">Send</Text>
          </View>
        </GradientCircle>
      </Pressable>
    </View>
  );
};
