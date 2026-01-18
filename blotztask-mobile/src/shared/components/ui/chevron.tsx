import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

export const AnimatedChevron = ({ progress, color }: { progress: any; color: string }) => {
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));
  return (
    <Animated.View style={iconStyle}>
      <Ionicons name="chevron-down" size={18} color={color} />
    </Animated.View>
  );
};
