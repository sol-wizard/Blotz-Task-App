import { useFirework, type FireworkVariant } from "@/feature/firework-animation/hooks/useFirework";
import { LOTTIE_ANIMATIONS } from "@/shared/constants/assets";
import LottieView from "lottie-react-native";
import { useWindowDimensions, View } from "react-native";

type FireworkOverlayConfig = {
  source: (typeof LOTTIE_ANIMATIONS)[keyof typeof LOTTIE_ANIMATIONS];
  resizeMode: "cover" | "contain";
  containerClassName: string;
  getAnimationSize: (width: number, height: number) => { width: number; height: number };
};

const FIREWORK_OVERLAY_CONFIG: Record<FireworkVariant, FireworkOverlayConfig> = {
  task: {
    source: LOTTIE_ANIMATIONS.fireworkTask,
    resizeMode: "cover",
    containerClassName: "flex-1",
    getAnimationSize: (width, height) => ({ width, height }),
  },
  subtask: {
    source: LOTTIE_ANIMATIONS.fireworkSubtask,
    resizeMode: "contain",
    containerClassName: "flex-1 items-center justify-center",
    getAnimationSize: (width, height) => {
      const size = Math.min(width, height) * 0.55;
      return { width: size, height: size };
    },
  },
};

function FireworkOverlay({ variant }: { variant: FireworkVariant }) {
  const { width, height } = useWindowDimensions();
  const { visible, playbackKey, dismiss } = useFirework()[variant];
  const config = FIREWORK_OVERLAY_CONFIG[variant];
  const animationSize = config.getAnimationSize(width, height);

  if (!visible) return null;

  return (
    <View pointerEvents="box-none" className={config.containerClassName}>
      <View pointerEvents="none">
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
    </View>
  );
}

export function FireworkOverlays() {
  return (
    <View pointerEvents="box-none" className="absolute inset-0 z-50">
      <FireworkOverlay variant="task" />
      <FireworkOverlay variant="subtask" />
    </View>
  );
}
