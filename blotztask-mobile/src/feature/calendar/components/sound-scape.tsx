import { ASSETS } from "@/shared/constants/assets";
import { Animated, Dimensions, ImageBackground, Pressable, Text } from "react-native";
import { SNAP_INTERVAL, ITEM_WIDTH, ITEM_GAP } from "./mode-bottomsheet";

// const SCREEN_WIDTH = Dimensions.get("window").width;
// const ITEM_WIDTH = 80;
// const ITEM_GAP = 12;
// const SNAP_INTERVAL = ITEM_WIDTH + ITEM_GAP;
// const PADDING_HORIZONTAL = (SCREEN_WIDTH - 32) / 2 - ITEM_WIDTH / 2;
// const LOOP_MULTIPLIER = 5;
// const GALLERY_ITEMS = Array(LOOP_MULTIPLIER).fill(SOUNDSCAPES).flat();

// 直接定义为一个普通的组件，不套 React.memo
export const SoundscapeCard = ({ item, index, scrollX, onPress }: any) => {
  const inputRange = [
    (index - 1) * SNAP_INTERVAL,
    index * SNAP_INTERVAL,
    (index + 1) * SNAP_INTERVAL,
  ];

  const translateY = scrollX.interpolate({
    inputRange,
    outputRange: [0, -12, 0],
    extrapolate: "clamp",
  });

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.95, 1, 0.95],
    extrapolate: "clamp",
  });

  return (
    <Pressable onPress={() => onPress(index, item.id)}>
      <Animated.View
        style={{
          width: ITEM_WIDTH,
          marginRight: ITEM_GAP,
          alignItems: "center",
          transform: [{ translateY }, { scale }],
          // Android 需要保留 elevation
          elevation: 6,
        }}
        // Tailwind 控制阴影
        className="shadow-md shadow-black/15"
      >
        <ImageBackground
          source={item.imageUrl}
          className="w-full h-[100px] border-[3px] border-white justify-end p-2 bg-gray-200"
          imageStyle={{ borderRadius: 20, resizeMode: "cover" }}
          style={{ borderRadius: 20, overflow: "hidden" }}
        >
          <Text className="text-white font-baloo text-[11px] text-center leading-tight shadow-sm shadow-black">
            {item.name}
          </Text>
        </ImageBackground>
      </Animated.View>
    </Pressable>
  );
};
