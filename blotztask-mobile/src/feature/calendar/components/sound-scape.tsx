import { ImageBackground, Pressable, Text, View } from "react-native";
import { ITEM_WIDTH, ITEM_GAP, PomodoroSoundscapeKey } from "../models/pomodoro-setting";
import { useTranslation } from "react-i18next";
import Animated, { interpolate, useAnimatedStyle } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";

type SoundscapeItem = {
  key: PomodoroSoundscapeKey;
  imageUrl: any;
};

interface SoundscapeCardProps {
  item: SoundscapeItem;
  index: number;
  scrollX: SharedValue<number>;
  isSelected: boolean;
  isPlaying: boolean;
  onPress: (index: number, key: PomodoroSoundscapeKey) => void;
  onTogglePlayback: () => void;
}

export const SoundscapeCard = ({
  item,
  index,
  scrollX,
  isSelected,
  isPlaying,
  onPress,
  onTogglePlayback,
}: SoundscapeCardProps) => {
  const { t } = useTranslation("pomodoro");

  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [index - 1, index, index + 1];

    return {
      transform: [{ translateY: interpolate(scrollX.value, inputRange, [0, -12, 0], "clamp") }],
    };
  });

  return (
    <Pressable onPress={() => onPress(index, item.key)}>
      <Animated.View
        style={[
          animatedStyle,
          {
            width: ITEM_WIDTH,
            marginRight: ITEM_GAP,
            elevation: 6,
          },
        ]}
        className="shadow-md shadow-black/15"
      >
        <ImageBackground
          source={item.imageUrl}
          className="w-full h-[100px] border-[3px] border-white justify-end p-2 bg-white"
          imageStyle={{ borderRadius: 20, resizeMode: "cover" }}
          style={{ borderRadius: 20, overflow: "hidden" }}
        >
          <Text className="text-white font-baloo text-[11px] text-center leading-tight shadow-sm shadow-black">
            {t(`soundscape.${item.key}`)}
          </Text>
        </ImageBackground>
        {isSelected && item.key !== "noSound" ? (
          <Pressable
            onPress={onTogglePlayback}
            className="absolute inset-0 items-center justify-center"
          >
            <View className="w-10 h-10 rounded-full items-center justify-center bg-black/45">
              <MaterialIcons name={isPlaying ? "pause" : "play-arrow"} size={28} color="#FFFFFF" />
            </View>
          </Pressable>
        ) : null}
      </Animated.View>
    </Pressable>
  );
};
