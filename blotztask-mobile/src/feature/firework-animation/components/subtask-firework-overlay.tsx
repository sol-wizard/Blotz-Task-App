import { useSubtaskFirework } from "@/feature/firework-animation/hooks/useSubtaskFirework";
import { LOTTIE_ANIMATIONS } from "@/shared/constants/assets";
import LottieView from "lottie-react-native";
import { Modal, useWindowDimensions, View } from "react-native";

export function SubtaskFireworkOverlay() {
  const { width, height } = useWindowDimensions();
  const { visible, playbackKey, dismissSubtaskFirework } = useSubtaskFirework();
  const animationSize = Math.min(width, height) * 0.55;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismissSubtaskFirework}
    >
      <View pointerEvents="box-none" className="flex-1 items-center justify-center">
        <LottieView
          key={playbackKey}
          source={LOTTIE_ANIMATIONS.fireworkSubtask}
          autoPlay
          loop={false}
          resizeMode="contain"
          onAnimationFinish={dismissSubtaskFirework}
          style={{ width: animationSize, height: animationSize }}
        />
      </View>
    </Modal>
  );
}
