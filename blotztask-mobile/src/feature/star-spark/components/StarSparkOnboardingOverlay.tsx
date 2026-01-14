// src/feature/star-spark/components/StarSparkOnboardingOverlay.tsx

import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Defs, Mask, Rect } from "react-native-svg";
import { OnboardingCard } from "@/shared/components/ui/onboarding-card";

interface Props {
  targetLayout: { x: number; y: number; width: number; height: number };
}

export const StarSparkOnboardingOverlay = ({ targetLayout }: Props) => {
  const { width, height } = useWindowDimensions();

  return (
    // zIndex 适中，容器 box-none 保证洞口和洞内区域可穿透；仅遮罩自身不拦截触摸
    <View style={[StyleSheet.absoluteFill, { zIndex: 10 }]} pointerEvents="box-none">
      {/* 视觉遮罩（pointerEvents 关闭，保证下层可点击） */}
      <Svg width={width} height={height} pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <Mask id="starspark-mask" maskUnits="userSpaceOnUse">
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

      {/* 复用现有的 OnboardingCard 组件，移除 Next 按钮 */}
      <OnboardingCard
        title="Long-press a task ✨"
        subtitle="Add it to today's list"
        style={{
          position: "absolute",
          top: targetLayout.y + targetLayout.height + 20,
          left: 20,
          right: 20,
          zIndex: 11,
        }}
      />
    </View>
  );
};
