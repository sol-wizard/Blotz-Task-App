import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { GradientColor } from "@/shared/components/gradient-color";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface IntroCarouselProps<T> {
  data: readonly T[];
  renderItem: (item: T) => React.ReactNode;
  onFinish: () => void | Promise<void>;
  continueLabel: string;
  finishLabel: string;
  skipLabel: string;
  dotContainerClassName?: string;
  activeDotClassName?: string;
  /** Disables Skip and Continue/Finish while a step has its own pending action (e.g. a redeem request in flight). */
  disableActions?: boolean;
}

export function IntroCarousel<T>({
  data,
  renderItem,
  onFinish,
  continueLabel,
  finishLabel,
  skipLabel,
  dotContainerClassName = "mb-6",
  activeDotClassName = "w-5 bg-black",
  disableActions = false,
}: IntroCarouselProps<T>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const isLast = activeIndex === data.length - 1;

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  const handleNext = () => {
    if (isLast) {
      void onFinish();
      return;
    }
    const next = activeIndex + 1;
    flatListRef.current?.scrollToIndex({ index: next, animated: true });
    setActiveIndex(next);
  };

  const handleBack = () => {
    if (activeIndex === 0) return;
    const prev = activeIndex - 1;
    flatListRef.current?.scrollToIndex({ index: prev, animated: true });
    setActiveIndex(prev);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-6 h-12" style={{ overflow: "visible" }}>
        <View className="flex-1 items-start">
          {activeIndex > 0 && (
            <Pressable onPress={handleBack} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color="#8C8C8C" />
            </Pressable>
          )}
        </View>
        <GradientColor className="h-[45px] w-[135px] overflow-visible">
          <View className="flex-1 flex-row justify-center items-center bg-transparent">
            <Text className="text-[30px] leading-11 font-balooExtraBold text-center">Blotz</Text>
          </View>
        </GradientColor>
        <View className="flex-1 items-end">
          <Pressable onPress={() => void onFinish()} hitSlop={10} disabled={disableActions}>
            <Text className="text-xl font-baloo text-black/40">{skipLabel}</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={data as T[]}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH, flex: 1 }}>{renderItem(item)}</View>
        )}
        keyExtractor={(_, index) => String(index)}
      />

      <View className="items-center pb-8 px-6">
        <View className={`flex-row items-center ${dotContainerClassName}`}>
          {data.map((_, index) => {
            const isActive = index === activeIndex;
            return (
              <View
                key={index}
                className={`${isActive ? activeDotClassName : "w-2 bg-gray-300"} h-2 rounded-full ${
                  index < data.length - 1 ? "mr-2" : ""
                }`}
              />
            );
          })}
        </View>
        <Pressable
          onPress={handleNext}
          disabled={disableActions}
          className={`w-[46%] h-[48px] rounded-full py-4 ${
            disableActions ? "bg-gray-200" : "bg-[#8BCC5A]"
          }`}
        >
          <Text className="text-white text-lg font-baloo text-center">
            {isLast ? finishLabel : continueLabel}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
