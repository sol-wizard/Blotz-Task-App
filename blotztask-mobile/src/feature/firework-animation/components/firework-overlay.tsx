import { useFirework, type FireworkVariant } from "@/feature/firework-animation/hooks/useFirework";
import { LOTTIE_ANIMATIONS } from "@/shared/constants/assets";
import LottieView from "lottie-react-native";
import { Modal, useWindowDimensions, View } from "react-native";

type FireworkOverlayConfig = {
  source: (typeof LOTTIE_ANIMATIONS)[keyof typeof LOTTIE_ANIMATIONS];
  resizeMode: "cover" | "contain";
  containerClassName: string;
  getSize: (width: number, height: number) => { width: number; height: number };
};

const FIREWORK_OVERLAY_CONFIG: Record<FireworkVariant, FireworkOverlayConfig> = {
  task: {
    source: LOTTIE_ANIMATIONS.fireworkTask,
    resizeMode: "cover",
    containerClassName: "flex-1",
    getSize: (width, height) => ({ width, height }),
  },
  subtask: {
    source: LOTTIE_ANIMATIONS.fireworkSubtask,
    resizeMode: "contain",
    containerClassName: "flex-1 items-center justify-center",
    getSize: (width, height) => {
      const size = Math.min(width, height) * 0.55;
      return { width: size, height: size };
    },
  },
};

function FireworkOverlay({ variant }: { variant: FireworkVariant }) {
  const { width, height } = useWindowDimensions();
  const { visible, playbackKey, dismiss } = useFirework()[variant];
  const config = FIREWORK_OVERLAY_CONFIG[variant];
  const animationSize = config.getSize(width, height);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View pointerEvents="box-none" className={config.containerClassName}>
        <LottieView
          key={playbackKey}
          source={config.source}
          autoPlay
          loop={false}
          resizeMode={config.resizeMode}
          onAnimationFinish={dismiss}
          style={animationSize}
        />
      </View>
    </Modal>
  );
}

export function FireworkOverlays() {
  return (
    <>
      <FireworkOverlay variant="task" />
      <FireworkOverlay variant="subtask" />
    </>
  );
}
