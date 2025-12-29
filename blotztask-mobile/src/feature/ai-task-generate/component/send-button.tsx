import { GradientCircle } from "@/shared/components/common/gradient-circle";
import { ASSETS } from "@/shared/constants/assets";
import LottieView from "lottie-react-native";
import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import { Text } from "react-native";
import { theme } from "@/shared/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
export const SendButton = ({
  isGenerating,
  abortListening: handleAbortListening,
  text,
  sendMessage,
}: {
  text: string;
  isGenerating: boolean;
  abortListening: () => void;
  sendMessage: (message: string) => void;
}) => {
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    if (isGenerating) {
      lottieRef.current?.play();
    } else {
      lottieRef.current?.reset();
    }
  }, [isGenerating]);

  return (
    <View className="flex-row items-center justify-center gap-2">
      <Pressable onPress={handleAbortListening}>
        <MaterialCommunityIcons name="close" size={18} color={theme.colors.primary} />
      </Pressable>
      <Pressable
        onPress={() => sendMessage(text)}
        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
      >
        <GradientCircle width={120} height={40}>
          <View className="flex-row items-center justify-center">
            {isGenerating ? (
              <LottieView
                ref={lottieRef}
                source={ASSETS.loading}
                loop={true}
                autoPlay={false}
                style={{ width: 25, height: 25, marginRight: 10 }}
              />
            ) : (
              ""
            )}

            <Text className="text-white text-m font-bold">Send</Text>
          </View>
        </GradientCircle>
      </Pressable>
    </View>
  );
};
