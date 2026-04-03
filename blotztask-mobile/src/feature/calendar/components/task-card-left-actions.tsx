import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated, { SharedValue, useAnimatedStyle } from "react-native-reanimated";

type LeftActionsProps = {
  progress: SharedValue<number>;
  onFocus: () => void | Promise<void>;
  onModest: () => void | Promise<void>;
  isFocusing: boolean;
  isModesting: boolean;
};
export const TaskCardLeftActions = ({
  progress,
  onFocus,
  onModest,
  isFocusing,
  isModesting,
}: LeftActionsProps) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -120 * (1 - progress.value) }],
  }));

  return (
    <Animated.View className="flex-row items-start justify-start gap-2 pr-4" style={animatedStyle}>
      <Pressable
        onPress={onFocus}
        disabled={isFocusing || isModesting}
        className={`h-20 w-24 rounded-3xl bg-blue-50 border border-blue-300 items-center justify-center ${
          isFocusing ? "opacity-50" : ""
        }`}
      >
        {isFocusing ? (
          <ActivityIndicator size="small" color="#53A8FF26" />
        ) : (
          <View className="items-center gap-1">
            <MaterialCommunityIcons name="cog" size={24} color="#53A8FF" />
            <Text className="text-blue-400 font-inter font-semibold text-[13px]">Modes</Text>
          </View>
        )}
      </Pressable>

      <Pressable
        onPress={onModest}
        disabled={isFocusing || isModesting}
        className={`h-20 w-24 rounded-3xl bg-orange-50 border border-orange-300  items-center justify-center ${
          isModesting ? "opacity-50" : ""
        }`}
      >
        {isModesting ? (
          <ActivityIndicator size="small" color="#FFAA4A" />
        ) : (
          <View className="items-center gap-1">
            <MaterialCommunityIcons name="clock" size={24} color="#FFAA4A" />
            <Text className="text-orange-400 font-inter font-semibold text-[13px]">Focus</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};
