import React from "react";
import { View, Text, Pressable, Image, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Defs, Mask, Rect } from "react-native-svg";
import { ASSETS } from "@/shared/constants/assets";

interface Props {
  targetLayout: { x: number; y: number; width: number; height: number };
  onNext: () => void;
}

export const StarSparkOnboardingOverlay = ({ targetLayout, onNext }: Props) => {
  const { width, height } = useWindowDimensions();

  console.log("Onboarding overlay dims", { width, height, targetLayout });

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]} pointerEvents="box-none">
      {/* 拦截洞外区域的四块透明层 */}
      <Pressable
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: targetLayout.y }}
        onPress={() => {}}
      />
      <Pressable
        style={{
          position: "absolute",
          top: targetLayout.y + targetLayout.height,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        onPress={() => {}}
      />
      <Pressable
        style={{
          position: "absolute",
          top: targetLayout.y,
          left: 0,
          width: targetLayout.x,
          height: targetLayout.height,
        }}
        onPress={() => {}}
      />
      <Pressable
        style={{
          position: "absolute",
          top: targetLayout.y,
          left: targetLayout.x + targetLayout.width,
          right: 0,
          height: targetLayout.height,
        }}
        onPress={() => {}}
      />

      {/* 视觉遮罩 */}
      <Svg width={width} height={height} pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <Mask id="starspark-mask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
            <Rect width={width} height={height} fill="white" />
            <Rect
              x={targetLayout.x}
              y={targetLayout.y}
              width={targetLayout.width}
              height={targetLayout.height}
              rx={16}
              fill="black"
            />
          </Mask>
        </Defs>
        <Rect width={width} height={height} fill="rgba(0,0,0,0.4)" mask="url(#starspark-mask)" />
      </Svg>

      {/* 文案卡片 */}
      <View
        style={{
          position: "absolute",
          top: targetLayout.y + targetLayout.height + 20,
          left: 20,
          right: 20,
        }}
        pointerEvents="box-none"
      >
        <View className="flex-row items-center bg-white rounded-[24px] px-5 py-4 shadow-xl">
          <View className="mr-3">
            <Image source={ASSETS.greenBun} className="w-12 h-12" />
          </View>
          <View className="flex-1">
            <Text className="text-[17px] font-balooBold text-info">Long-press a task ✨</Text>
            <Text className="text-[14px] font-baloo text-info opacity-80">
              Add it to today's list
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onNext}
          className="self-end mt-4 bg-[#CDF79A] px-10 py-3 rounded-full shadow-lg active:opacity-70"
        >
          <Text className="font-balooBold text-secondary text-[18px]">Next</Text>
        </Pressable>
      </View>
    </View>
  );
};
