import React, { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, Modal, Image, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  runOnUI,
} from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import { ASSETS } from "@/shared/constants/assets";
import { LinearGradient } from "expo-linear-gradient";
import { SoundscapeCard } from "./sound-scape";
import { useTranslation } from "react-i18next";
import { PomodoroSoundscapeKey } from "../models/pomodoro-setting";
import { usePomodoroSettingMutation } from "../hooks/usePomodoroSetting";
import { usePomodoroSoundscapePlayer } from "../hooks/usePomodoroSoundscapePlayer";

interface ModeBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSoundscape: PomodoroSoundscapeKey;
  selectedDuration: number;
}

const DURATIONS = [
  { key: "25m", timing: 25 },
  { key: "flow", timing: 0 },
];

const SOUNDSCAPES = [
  {
    key: "easyFocus",
    imageUrl: ASSETS.pomodoroSoundEasyFocus,
  },
  {
    key: "deepWork",
    imageUrl: ASSETS.pomodoroSoundDeepWork,
  },
  {
    key: "taskFlow",
    imageUrl: ASSETS.pomodoroSoundTaskFlow,
  },
  {
    key: "calmMind",
    imageUrl: ASSETS.pomodoroSoundCalmMind,
  },
  {
    key: "cafeVibe",
    imageUrl: ASSETS.pomodoroSoundCafeVibe,
  },
  { key: "noSound", imageUrl: ASSETS.pomodoroSoundNoSound },
];

const SCREEN_WIDTH = Dimensions.get("window").width;
export const ITEM_WIDTH = 80;
export const ITEM_GAP = 12;
const SNAP_INTERVAL = ITEM_WIDTH + ITEM_GAP;
const PADDING_HORIZONTAL = (SCREEN_WIDTH - 32) / 2 - ITEM_WIDTH / 2;
const LOOP_MULTIPLIER = 5;
const GALLERY_ITEMS = Array(LOOP_MULTIPLIER).fill(SOUNDSCAPES).flat();
const SINGLE_LENGTH = SOUNDSCAPES.length;
const MIDDLE_LOOP_START = SINGLE_LENGTH * Math.floor(LOOP_MULTIPLIER / 2);

const getGalleryIndex = (soundscape: string) => {
  const soundscapeIndex = SOUNDSCAPES.findIndex((item) => item.key === soundscape);
  return MIDDLE_LOOP_START + (soundscapeIndex >= 0 ? soundscapeIndex : 0);
};

export const ModeBottomSheet = ({
  isOpen,
  onClose,
  selectedSoundscape,
  selectedDuration,
}: ModeBottomSheetProps) => {
  const { savePomodoroSetting, isSavingPomodoroSetting } = usePomodoroSettingMutation();
  const [draftDuration, setDraftDuration] = useState<number>(selectedDuration);
  const [draftSoundscape, setDraftSoundscape] = useState<PomodoroSoundscapeKey>(selectedSoundscape);
  const initialTargetIndex = getGalleryIndex(selectedSoundscape);
  const [activeIndex, setActiveIndex] = useState<number>(getGalleryIndex(selectedSoundscape));
  const { t } = useTranslation("pomodoro");
  const { isPlaying, togglePlayback, stopPlayback } = usePomodoroSoundscapePlayer(draftSoundscape);

  useEffect(() => {
    if (!isOpen) return;
    const targetIndex = getGalleryIndex(selectedSoundscape);
    setDraftDuration(selectedDuration);
    setDraftSoundscape(selectedSoundscape);
    setActiveIndex(targetIndex);
    scrollX.value = targetIndex;

    flatListRef.current?.scrollToOffset({
      offset: targetIndex * SNAP_INTERVAL,
      animated: false,
    });

    console.log(
      "ModeBottomSheet opened with soundscape:",
      selectedSoundscape,
      "and duration:",
      selectedDuration,
    );
  }, [isOpen, selectedDuration, selectedSoundscape]);

  const scrollX = useSharedValue(initialTargetIndex);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x / SNAP_INTERVAL;
  });

  const flatListRef = useRef<Animated.FlatList<any>>(null);

  const handleMomentumScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SNAP_INTERVAL);

    const realIndex = ((index % SINGLE_LENGTH) + SINGLE_LENGTH) % SINGLE_LENGTH;
    const selectedKey = SOUNDSCAPES[realIndex].key;
    setDraftSoundscape(selectedKey as PomodoroSoundscapeKey);
    setActiveIndex(index);

    if (index < SINGLE_LENGTH || index >= SINGLE_LENGTH * (LOOP_MULTIPLIER - 1)) {
      const newIndex = MIDDLE_LOOP_START + realIndex;

      flatListRef.current?.scrollToOffset({
        offset: newIndex * SNAP_INTERVAL,
        animated: false,
      });

      runOnUI(() => {
        scrollX.value = newIndex;
      })();
    }
  };

  const handleItemPress = (index: number, key: PomodoroSoundscapeKey) => {
    setDraftSoundscape(key);
    setActiveIndex(index);
    flatListRef.current?.scrollToOffset({
      offset: index * SNAP_INTERVAL,
      animated: true,
    });
  };

  const handleSave = async () => {
    try {
      await savePomodoroSetting({
        timing: draftDuration,
        sound: draftSoundscape,
      });
      stopPlayback();
      onClose();
    } catch (error) {
      console.error("Failed to save pomodoro setting:", error);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="slide">
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-background rounded-t-3xl pt-4 pb-12">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6 px-4">
            <Pressable
              onPress={onClose}
              className="w-12 h-12 bg-gray-200/60 rounded-full items-center justify-center"
            >
              <MaterialIcons name="close" size={24} color="#8C8C8C" />
            </Pressable>
            <Text className="text-lg font-baloo text-[#444964]">{t("focusMode.title")}</Text>
            <Pressable
              onPress={handleSave}
              className="w-12 h-12 bg-gray-200/60 rounded-full items-center justify-center"
            >
              <MaterialIcons name="check" size={24} color="#8C8C8C" />
            </Pressable>
          </View>

          {/* Duration Section */}
          <Text className="text-[#444964] font-inter font-bold font-baloo mb-3 mx-6 text-xl">
            {t("focusMode.duration")}
          </Text>
          <View className="bg-white mx-4 rounded-3xl p-5 mb-6 shadow-sm shadow-gray-200 flex-row gap-3">
            {DURATIONS.map((duration) => (
              <Pressable
                key={duration.key}
                onPress={() => setDraftDuration(duration.timing)}
                className={`px-4 h-10 item-center justify-center rounded-2xl border-2 ${
                  draftDuration === duration.timing
                    ? "bg-highlight border-highlight"
                    : "bg-white border-highlight"
                }`}
              >
                <Text
                  className={`font-baloo text-lg ${
                    draftDuration === duration.timing ? "text-white" : "text-[#9AD513]"
                  }`}
                >
                  {duration.key === "flow" ? t("focusMode.flow") : duration.key}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Soundscapes Section */}
          <Text className="text-[#444964] font-baloo mb-3 mx-6 text-xl">
            {t("focusMode.soundscapes")}
          </Text>

          <View className="bg-white mx-4 rounded-3xl p-4 shadow-sm shadow-gray-200">
            {/* Gallery */}
            <View className="relative h-44 -mx-5">
              <Animated.FlatList
                ref={flatListRef}
                data={GALLERY_ITEMS}
                keyExtractor={(item, index) => `${item.key}-${index}`}
                renderItem={({ item, index }) => (
                  <SoundscapeCard
                    item={item}
                    index={index}
                    scrollX={scrollX}
                    isSelected={index === activeIndex}
                    isPlaying={isPlaying}
                    onPress={handleItemPress}
                    onTogglePlayback={togglePlayback}
                  />
                )}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={SNAP_INTERVAL}
                decelerationRate="fast"
                contentContainerStyle={{
                  paddingHorizontal: PADDING_HORIZONTAL,
                  alignItems: "center",
                  paddingBottom: 0,
                }}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                onScroll={onScroll}
                scrollEventThrottle={16}
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
              className="items-center -mt-12 relative"
              onPress={() => setDraftSoundscape("noSound")}
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
