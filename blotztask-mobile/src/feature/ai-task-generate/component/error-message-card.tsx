import { ASSETS } from "@/shared/constants/assets";
import { Text, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import Animated from "react-native-reanimated";

export const ErrorMessageCard = ({ errorMessage }: { errorMessage?: string }) => {
  const { t } = useTranslation("aiTaskGenerate");
  return (
    <Animated.View
      className="bg-background rounded-2xl px-4 py-2 flex-row items-center mt-2"
      entering={MotionAnimations.rightEntering}
      exiting={MotionAnimations.leftExiting}
    >
      <Text className="text-info text-xl font-balooBold w-72 px-2 flex-1">
        {errorMessage?.trim() ? errorMessage : t("errors.default")}
      </Text>
      <Image source={ASSETS.greenBun} className="w-15 h-15" />
    </Animated.View>
  );
};
