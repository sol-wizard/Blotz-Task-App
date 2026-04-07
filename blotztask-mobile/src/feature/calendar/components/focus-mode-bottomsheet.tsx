import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ImageBackground,
  Image,
  Dimensions,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ASSETS } from "@/shared/constants/assets";
import { LinearGradient } from "expo-linear-gradient";

interface FocusModeBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const ITEM_WIDTH = 80;
const ITEM_GAP = 12;
const SNAP_INTERVAL = ITEM_WIDTH + ITEM_GAP;
// 外层卡片有 mx-4 所以屏幕宽度减掉 32 才是内部实际宽度
const PADDING_HORIZONTAL = (SCREEN_WIDTH - 32) / 2 - ITEM_WIDTH / 2;

const DURATIONS = [
  { id: 1, label: "25m" },
  { id: 2, label: "flow" },
];

const SOUNDSCAPES = [
  { id: 1, name: "Easy\nFocus", imageUrl: ASSETS.pomodoroSoundEasyFocus },
  { id: 2, name: "Deep\nWork", imageUrl: ASSETS.pomodoroSoundDeepWork },
  { id: 3, name: "Task\nFlow", imageUrl: ASSETS.pomodoroSoundTaskFlow },
  { id: 4, name: "Calm\nVibes", imageUrl: ASSETS.pomodoroSoundCalmMind },
  { id: 5, name: "Cafe\nVibes", imageUrl: ASSETS.pomodoroSoundCafeVibe },
];

export const FocusModeBottomSheet = ({ isOpen, onClose }: FocusModeBottomSheetProps) => {
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [selectedSoundscape, setSelectedSoundscape] = useState(1);

  // 用无限的数据伪造环形，我们把它重复 5 次
  const GALLERY_ITEMS = [
    ...SOUNDSCAPES,
    ...SOUNDSCAPES,
    ...SOUNDSCAPES,
    ...SOUNDSCAPES,
    ...SOUNDSCAPES,
  ];

  // 从中间那一组（第三段）开始渲染
  const INITIAL_INDEX = Math.floor(GALLERY_ITEMS.length / 2);

  const flatListRef = useRef<Animated.FlatList<any>>(null);
  const scrollX = useRef(new Animated.Value(INITIAL_INDEX * SNAP_INTERVAL)).current;

  // 这里的监听：主要用于松手或滑动完成时更新逻辑的状态（让其他地方知道你选了哪个）
  const handleMomentumScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SNAP_INTERVAL);
    const safeIndex = Math.max(0, Math.min(index, GALLERY_ITEMS.length - 1));
    const newId = GALLERY_ITEMS[safeIndex].id;

    if (selectedSoundscape !== newId) {
      setSelectedSoundscape(newId);
    }
  };

  const handleItemPress = (index: number, id: number) => {
    setSelectedSoundscape(id);
    flatListRef.current?.scrollToOffset({
      offset: index * SNAP_INTERVAL,
      animated: true,
    });
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    // 为每个 Item 计算相对于当前滚动进度的位置
    const inputRange = [
      (index - 1) * SNAP_INTERVAL,
      index * SNAP_INTERVAL,
      (index + 1) * SNAP_INTERVAL,
    ];

    // 当图片在正中间时， translateY 变成负数（上升），其余为 0
    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [0, -12, 0], // 中间的项上浮 12 像素
      extrapolate: "clamp",
    });

    // 可选：让旁边的稍微变小点
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.95, 1, 0.95],
      extrapolate: "clamp",
    });

    return (
      <Pressable onPress={() => handleItemPress(index, item.id)}>
        <Animated.View
          style={{
            width: ITEM_WIDTH,
            marginRight: ITEM_GAP,
            transform: [{ translateY }, { scale }],
            alignItems: "center",
          }}
        >
          <ImageBackground
            source={item.imageUrl}
            className="w-20 h-24 border-2 border-white justify-end p-2 bg-gray-200"
            // 防止 iOS 背景图越界
            imageStyle={{ borderRadius: 16, resizeMode: "cover" }}
            style={{ borderRadius: 16, overflow: "hidden" }}
          >
            <Text className="text-white font-inter font-bold text-[11px] text-center leading-tight shadow-sm shadow-black">
              {item.name}
            </Text>
          </ImageBackground>
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <Modal visible={isOpen} transparent animationType="slide">
      <View className="flex-1 bg-black/50 justify-end">
        {/* 底部灰色 */}
        <View className="bg-[#F5F9FA] rounded-t-[32px] pt-6 pb-12">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6 px-6">
            <Pressable
              onPress={onClose}
              className="w-8 h-8 bg-gray-200/60 rounded-full items-center justify-center"
            >
              <MaterialIcons name="close" size={20} color="#8C8C8C" />
            </Pressable>
            <Text className="text-lg font-inter font-bold text-[#444964]">Focus Mode</Text>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 bg-gray-200/60 rounded-full items-center justify-center"
            >
              <MaterialIcons name="check" size={20} color="#8C8C8C" />
            </Pressable>
          </View>

          {/* Duration Section */}
          <Text className="text-[#444964] font-inter font-bold mb-3 mx-6 text-[15px]">
            Duration
          </Text>
          <View className="bg-white mx-4 rounded-[20px] p-5 mb-6 shadow-sm shadow-gray-200">
            <View className="flex-row gap-3">
              {DURATIONS.map((duration) => (
                <Pressable
                  key={duration.id}
                  onPress={() => setSelectedDuration(duration.id)}
                  className={`px-6 py-2.5 rounded-2xl border-[1.5px] ${
                    selectedDuration === duration.id
                      ? "bg-[#9AD513] border-[#9AD513]"
                      : "bg-white border-[#9AD513]"
                  }`}
                >
                  <Text
                    className={`font-inter font-bold text-[14px] ${
                      selectedDuration === duration.id ? "text-white" : "text-[#9AD513]"
                    }`}
                  >
                    {duration.label === "flow" ? `∞ flow` : duration.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Soundscapes Section */}
          <Text className="text-[#444964] font-inter font-bold mb-3 mx-6 text-[15px]">
            Soundscapes
          </Text>

          <View className="bg-white mx-4 rounded-3xl p-5 pb-6 shadow-sm shadow-gray-200">
            {/* 画廊容器 */}
            <View className="relative h-32 -mx-5">
              <Animated.FlatList
                ref={flatListRef}
                data={GALLERY_ITEMS}
                keyExtractor={(_, index) => index.toString()}
                renderItem={renderItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={SNAP_INTERVAL}
                decelerationRate="fast"
                contentContainerStyle={{
                  paddingHorizontal: PADDING_HORIZONTAL,
                  alignItems: "flex-end", // 靠下对齐，使得向上的弹跳空间够大
                  paddingBottom: 15, // 给卡片下方留出阴影和按压形变的空间
                }}
                // 滑动松开手、并且动效停止时触发的状态更新
                onMomentumScrollEnd={handleMomentumScrollEnd}
                // 原生的滚动事件绑定到 scrollX 变量，利用它驱动所有的插值动画，60帧不卡顿！
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                  useNativeDriver: true,
                })}
                scrollEventThrottle={16}
                // 默认滚到中间去
                initialScrollIndex={INITIAL_INDEX}
                getItemLayout={(_, index) => ({
                  length: SNAP_INTERVAL,
                  offset: SNAP_INTERVAL * index,
                  index,
                })}
              />

              {/* 渐变遮罩放在外部 View 保证不被列表滚动带着跑 */}
              <LinearGradient
                colors={["rgba(255,255,255,1)", "rgba(255,255,255,0)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="absolute left-0 top-0 bottom-0 w-16 z-10"
                pointerEvents="none"
              />
              <LinearGradient
                colors={["rgba(255,255,255,0)", "rgba(255,255,255,1)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="absolute right-0 top-0 bottom-0 w-16 z-10"
                pointerEvents="none"
              />
            </View>

            {/* 自定义 Choose */}
            <Pressable
              className="items-center -mt-8 relative"
              onPress={() => setSelectedSoundscape(6)}
            >
              <Image
                source={ASSETS.pomodoroSoundChoose}
                className="w-32 h-12"
                resizeMode="contain"
              />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
