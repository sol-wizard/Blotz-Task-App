import React, { useEffect, useState } from "react";
import { View, Pressable, Text } from "react-native";
import { formatDateRange } from "../util/format-date-range";
import { CustomCheckbox } from "@/shared/components/ui/custom-checkbox";

// [ADDED] 手势与动画
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface TaskCardProps {
  id: string;
  title: string;
  startTime?: string;
  endTime?: string;
  isCompleted?: boolean;
  onToggleComplete?: (id: string, completed: boolean) => void;
  onPress?: () => void;

  // [ADDED] 左滑后点击垃圾桶触发
  onDelete?: (id: string) => Promise<void> | void;
}

// [ADDED] 右侧动作区宽度（想让按钮更靠左，可同时把这里和 w-[64px] 一起改小到 60/56）
const ACTION_WIDTH = 64;
const OPEN_X = -ACTION_WIDTH;
const OPEN_THRESHOLD = ACTION_WIDTH * 0.55;

export default function TaskCard({
  id,
  title,
  startTime,
  endTime,
  isCompleted = false,
  onToggleComplete,
  onPress,

  // [ADDED]
  onDelete,
}: TaskCardProps) {
  const [checked, setChecked] = useState(isCompleted);

  // [ADDED] 仅在滑开时允许点击右侧动作
  const [actionsEnabled, setActionsEnabled] = useState(false);

  // [ADDED] 左右位移（负值表示左滑）
  const translateX = useSharedValue(0);

  useEffect(() => {
    setChecked(isCompleted);
  }, [isCompleted]);

  // [ADDED] 手势：只允许向左滑，松手吸附到 0 或 OPEN_X
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationX < 0) {
        translateX.value = Math.max(OPEN_X, e.translationX);
      } else {
        translateX.value = 0;
      }
    })
    .onEnd(() => {
      const open = Math.abs(translateX.value) > OPEN_THRESHOLD;
      translateX.value = withTiming(open ? OPEN_X : 0, { duration: 160 });
      runOnJS(setActionsEnabled)(open);
    });

  // [ADDED] 内容层跟随手势移动
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // [ADDED] 右侧动作条：随进度滑入 + 渐显
  const rightActionStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      -translateX.value,
      [0, ACTION_WIDTH],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: interpolate(progress, [0, 1], [ACTION_WIDTH, 0]) },
      ],
      opacity: progress,
    };
  });

  // [ADDED] 分隔线显隐（与动作条同进同出）
  const dividerStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      -translateX.value,
      [0, ACTION_WIDTH],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity: progress };
  });

  // [ADDED] 左侧“竖条+勾选框”稍多滑一点，制造“被推走”感
  const leftExtrasStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * 1.25 }],
  }));

  const handleToggleComplete = () => {
    const newChecked = !checked;
    setChecked(newChecked);
    onToggleComplete?.(id, newChecked);
  };

  const timePeriod = formatDateRange({startTime, endTime});
  

  return (
    // [CHANGED] 用单一容器负责圆角/阴影，overflow-hidden 防止看起来像“两张卡片”
    <View className="relative mx-4 my-2 rounded-2xl bg-white shadow-sm shadow-black/10 elevation-3 overflow-hidden">
      {/* [ADDED] 右侧动作区（宽度与 ACTION_WIDTH 保持一致） */}
      <Animated.View
        style={rightActionStyle}
        pointerEvents={actionsEnabled ? "auto" : "none"}
        className="absolute right-0 top-0 bottom-0 w-[64px] flex-row items-center justify-start z-10 px-2"
      >
        {/* [ADDED] 竖灰色分隔线：与左侧一致 6x30 */}
        <Animated.View
          pointerEvents="none"
          style={dividerStyle}
          className="w-[6px] h-[30px] bg-neutral-300 rounded-full mr-[4px]"
        />

        {/* [ADDED] 更小的垃圾桶按钮 */}
        <Pressable
          onPress={async () => {
            if (!onDelete) return;
            await onDelete(id);                // 触发父级删除
            translateX.value = withTiming(0);  // 删除后收回
            runOnJS(setActionsEnabled)(false);
          }}
          android_ripple={{ color: "#e5e7eb", borderless: true }}
          className="w-[40px] h-[40px] rounded-full border-2 border-neutral-300 items-center justify-center"
        >
          <MaterialCommunityIcons name="trash-can-outline" size={18} color="#6B7280" />
        </Pressable>
      </Animated.View>

      {/* [MOVED] 原卡片主体 → 改为手势驱动的内容层 */}
      <GestureDetector gesture={pan}>
        <Animated.View
          style={cardStyle}
          className="bg-white rounded-2xl"
        >
          <Pressable onPress={onPress}>
            <View className="flex-row items-center p-5">
              {/* [CHANGED] 左侧组合：竖条 + 勾选框；整体加了 leftExtrasStyle */}
              <Animated.View style={leftExtrasStyle} className="flex-row items-center mr-3">
                {/* [CHANGED] 竖条宽度从 5px 调到 6px，与右侧分隔线一致 */}
                <View className="w-[6px] h-[30px] bg-neutral-300 rounded-[3px] mr-3" />

                {/* 保留你原来的自定义勾选框 */}
                <CustomCheckbox
                  checked={checked}
                  onPress={handleToggleComplete}
                />
              </Animated.View>

              {/* 内容区 */}
              <View className="flex-1 justify-start pt-0">
                <Text 
                  className={`text-base font-bold ${checked ? 'text-neutral-400 line-through' : 'text-black'}`}
                >
                  {title}
                </Text>
                {timePeriod && (
                  <Text className="mt-1 text-[13px] text-neutral-400 font-semibold">
                    {timePeriod}
                  </Text>
                )}
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}