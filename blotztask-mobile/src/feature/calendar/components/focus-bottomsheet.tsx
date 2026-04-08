import React, { useState, useRef, useMemo, useCallback } from "react";
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

const SCREEN_WIDTH = Dimensions.get("window").width;
const ITEM_WIDTH = 80;
const ITEM_GAP = 12;
const SNAP_INTERVAL = ITEM_WIDTH + ITEM_GAP;
const PADDING_HORIZONTAL = (SCREEN_WIDTH - 32) / 2 - ITEM_WIDTH / 2;
const LOOP_MULTIPLIER = 5;
const GALLERY_ITEMS = Array(LOOP_MULTIPLIER).fill(SOUNDSCAPES).flat();

export const FocusBottomSheet = ({ isOpen, onClose }: FocusModeBottomSheetProps) => {
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [selectedSoundscape, setSelectedSoundscape] = useState(1);

  const SINGLE_LENGTH = SOUNDSCAPES.length;
  const MIDDLE_INDEX = SINGLE_LENGTH * Math.floor(LOOP_MULTIPLIER / 2);
  const INITIAL_INDEX = MIDDLE_INDEX;

  const flatListRef = useRef<Animated.FlatList<any>>(null);
  const scrollX = useRef(new Animated.Value(INITIAL_INDEX * SNAP_INTERVAL)).current;

  const handleMomentumScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SNAP_INTERVAL);

    const realIndex = ((index % SINGLE_LENGTH) + SINGLE_LENGTH) % SINGLE_LENGTH;
    const newId = SOUNDSCAPES[realIndex].id;

    if (selectedSoundscape !== newId) {
      setSelectedSoundscape(newId);
    }

    if (index < SINGLE_LENGTH || index >= SINGLE_LENGTH * (LOOP_MULTIPLIER - 1)) {
      const newIndex = MIDDLE_INDEX + realIndex;

      flatListRef.current?.scrollToOffset({
        offset: newIndex * SNAP_INTERVAL,
        animated: false,
      });

      scrollX.setValue(newIndex * SNAP_INTERVAL);
    }
  };

  const handleItemPress = (index: number, id: number) => {
    setSelectedSoundscape(id);
    flatListRef.current?.scrollToOffset({
      offset: index * SNAP_INTERVAL,
      animated: true,
    });
  };

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
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
        <Pressable onPress={() => handleItemPress(index, item.id)}>
          <Animated.View
            style={{
              width: ITEM_WIDTH,
              marginRight: ITEM_GAP,
              transform: [{ translateY }, { scale }],
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <ImageBackground
              source={item.imageUrl}
              className="w-20 h-24 border-2 border-white justify-end p-2 bg-gray-200"
              imageStyle={{ borderRadius: 16, resizeMode: "cover" }}
              style={{ borderRadius: 16, overflow: "hidden" }}
            >
              <Text className="text-white font-inter font-bold font-baloo text-md text-center leading-tight shadow-sm shadow-black">
                {item.name}
              </Text>
            </ImageBackground>
          </Animated.View>
        </Pressable>
      );
    },
    [scrollX],
  );

  return (
    <Modal visible={isOpen} transparent animationType="slide">
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-background rounded-t-3xl pt-6 pb-12">
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
          <Text className="text-[#444964] font-inter font-bold font-baloo mb-3 mx-6 text-xl">
            Duration
          </Text>
          <View className="bg-white mx-4 rounded-3xl p-5 mb-6 shadow-sm shadow-gray-200">
            <View className="flex-row gap-3">
              {DURATIONS.map((duration) => (
                <Pressable
                  key={duration.id}
                  onPress={() => setSelectedDuration(duration.id)}
                  className={`px-4 h-10 item-center justify-center rounded-2xl border-2 ${
                    selectedDuration === duration.id
                      ? "bg-[#9AD513] border-[#9AD513]"
                      : "bg-white border-[#9AD513]"
                  }`}
                >
                  <Text
                    className={`font-inter font-bold font-baloo text-lg ${
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
          <Text className="text-[#444964] font-inter font-bold font-baloo mb-3 mx-6 text-xl">
            Soundscapes
          </Text>

          <View className="bg-white mx-4 rounded-3xl p-5 pb-6 shadow-sm shadow-gray-200">
            {/* Gallery */}
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
                  alignItems: "flex-end",
                  paddingBottom: 15,
                }}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                  useNativeDriver: true,
                })}
                scrollEventThrottle={16}
                initialScrollIndex={INITIAL_INDEX}
                getItemLayout={(_, index) => ({
                  length: SNAP_INTERVAL,
                  offset: SNAP_INTERVAL * index,
                  index,
                })}
              />

              {/* === left gradient === */}
              <View
                pointerEvents="none"
                className="absolute left-0 top-0 bottom-0 w-12 z-10"
                style={{
                  elevation: 10, // for Android to ensure it appears above the list items
                }}
              >
                <LinearGradient
                  colors={["#FFFFFFFF", "#FFFFFF00"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
              </View>

              {/* === right gradient === */}
              <View
                pointerEvents="none"
                className="absolute right-0 top-0 bottom-0 w-12 z-10"
                style={{
                  elevation: 10,
                }}
              >
                <LinearGradient
                  colors={["#FFFFFF00", "#FFFFFFFF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
              </View>
            </View>

            {/* pic for soundscape */}
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
