import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import Animated, { SharedValue, useAnimatedStyle } from "react-native-reanimated";

type RightActionsProps = {
  progress: SharedValue<number>;
  taskId: number;
  onClose: () => void;
};
export const RightActions = ({ progress, taskId, onClose }: RightActionsProps) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: 120 * (1 - progress.value) }],
  }));

  return (
    <Animated.View
      className="w-50 self-start flex-row items-start justify-end gap-3 pl-4"
      style={animatedStyle}
    >
      <Pressable
        onPress={() => {
          console.log("Pin task", taskId);
          onClose();
        }}
        className="h-20 w-20 items-center justify-center rounded-2xl bg-[#DCF5C7]"
      >
        <MaterialCommunityIcons name="arrow-up-bold" size={22} color="#5B9E2E" />
      </Pressable>

      <Pressable
        onPress={() => {
          console.log("Delete task", taskId);
          onClose();
        }}
        className="h-20 w-20 items-center justify-center rounded-2xl bg-[#FCE4E4]"
      >
        <MaterialCommunityIcons name="trash-can-outline" size={22} color="#E05C5C" />
      </Pressable>
    </Animated.View>
  );
};
