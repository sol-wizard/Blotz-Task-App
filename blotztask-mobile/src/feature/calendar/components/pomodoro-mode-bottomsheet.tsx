import React, { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, Modal, Image, Dimensions } from "react-native";
import Animated, { useSharedValue, useAnimatedScrollHandler } from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import { ASSETS } from "@/shared/constants/assets";
import { LinearGradient } from "expo-linear-gradient";
import { SoundscapeCard } from "./sound-scape";
import { useTranslation } from "react-i18next";
import {
  PomodoroSoundscapeKey,
  SOUNDSCAPES_DATA,
  ITEM_WIDTH,
  SNAP_INTERVAL,
} from "../models/pomodoro-setting";
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

// Animated values for soundscape list
const SCREEN_WIDTH = Dimensions.get("window").width;
const PADDING_HORIZONTAL = (SCREEN_WIDTH - 32) / 2 - ITEM_WIDTH / 2;

export const ModeBottomSheet = ({
  isOpen,
  onClose,
  selectedSoundscape,
  selectedDuration,
}: ModeBottomSheetProps) => {
  // Mutations
  const { updatePomodoroSetting } = usePomodoroSettingMutation();
  const [draftDuration, setDraftDuration] = useState<number>(selectedDuration);
  const [draftSoundscape, setDraftSoundscape] = useState<PomodoroSoundscapeKey>(selectedSoundscape);
  const { isPlaying, togglePlayback, stopPlayback } = usePomodoroSoundscapePlayer(draftSoundscape);

  const { t } = useTranslation("pomodoro");

  useEffect(() => {
    if (!isOpen) return;
    setDraftDuration(selectedDuration);
    setDraftSoundscape(selectedSoundscape);
    const index = SOUNDSCAPES_DATA.findIndex((s) => s.key === selectedSoundscape);
    scrollX.value = index;
    flatListRef.current?.scrollToOffset({
      offset: index * SNAP_INTERVAL,
      animated: false,
    });
  }, [isOpen, selectedDuration, selectedSoundscape]);

  // Animated values and functions for soundscape list
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x / SNAP_INTERVAL;
  });

  const flatListRef = useRef<Animated.FlatList<any>>(null);

  const handleMomentumScrollEnd = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SNAP_INTERVAL);

    if (SOUNDSCAPES_DATA[index]) {
      const selectedKey = SOUNDSCAPES_DATA[index].key;
      setDraftSoundscape(selectedKey);
    }
  };

  // Functions to handle item selection and saving settings
  const handleItemPress = (index: number, key: PomodoroSoundscapeKey) => {
    setDraftSoundscape(key);
    flatListRef.current?.scrollToOffset({
      offset: index * SNAP_INTERVAL,
      animated: true,
    });
  };

  const handleSave = async () => {
    const isCountDown = draftDuration !== 0;
    await updatePomodoroSetting({
      timing: draftDuration,
      sound: draftSoundscape,
      isCountdown: isCountDown,
    });
    stopPlayback();
    onClose();
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
                data={SOUNDSCAPES_DATA}
                keyExtractor={(item) => item.key}
                renderItem={({ item, index }) => (
                  <SoundscapeCard
                    item={item}
                    index={index}
                    scrollX={scrollX}
                    isSelected={draftSoundscape === item.key}
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
            <Pressable className="items-center -mt-12 relative">
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
