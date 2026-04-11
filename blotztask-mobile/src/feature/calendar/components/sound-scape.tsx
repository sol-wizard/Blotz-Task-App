import { ImageBackground, Pressable, Text } from "react-native";
import { ITEM_WIDTH, ITEM_GAP } from "./mode-bottomsheet";
import { useTranslation } from "react-i18next";
import Animated, { interpolate, useAnimatedStyle } from "react-native-reanimated";

export const SoundscapeCard = ({ item, index, scrollX, onPress }: any) => {
  const { t } = useTranslation("pomodoro");

  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [index - 1, index, index + 1];

    return {
      transform: [{ translateY: interpolate(scrollX.value, inputRange, [0, -12, 0], "clamp") }],
    };
  });

  return (
    <Pressable onPress={() => onPress(index, item.id)}>
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
      </Animated.View>
    </Pressable>
  );
};
