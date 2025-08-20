import React, { useEffect, useState } from "react";
import { View, Pressable, Text } from "react-native";
import { format } from "date-fns";
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
  startTime?: string | null;
  endTime?: string | null;
  isCompleted?: boolean;
  onToggleComplete?: (id: string, completed: boolean) => void;
  onPress?: () => void;
  onDelete?: (id: string) => Promise<void> | void;
}

const ACTION_WIDTH = 72;
const OPEN_X = -ACTION_WIDTH;                  // 最大左滑距离
const OPEN_THRESHOLD = ACTION_WIDTH * 0.55;

export default function TaskCard({
  id,
  title,
  startTime,
  endTime,
  isCompleted = false,
  onToggleComplete,
  onPress,
  onDelete,
}: TaskCardProps) {
  const [checked, setChecked] = useState(isCompleted);

  useEffect(() => {
    setChecked(isCompleted);
  }, [isCompleted]);

  // 右侧动作是否可点击（避免被滑动层拦截）
  const [actionsEnabled, setActionsEnabled] = useState(false);

  // 左右位移（负值表示左滑）
  const translateX = useSharedValue(0);

  // 仅允许向左滑；松手后吸附到 0 或 OPEN_X
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
      runOnJS(setActionsEnabled)(open); // ✅ 仅打开时允许点击右侧按钮
    });

  // 内容层平移
  const cardContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // 右侧动作条：滑入 + 渐显
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

  // 竖分隔线的显隐（与右侧动作区同进同出）
  const dividerStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      -translateX.value,
      [0, ACTION_WIDTH],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity: progress };
  });

  // 左侧“竖灰条+勾选框”比主体多滑一点
  const leftExtrasStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * 1.25 }],
  }));

  const handleToggleComplete = () => {
    const newChecked = !checked;
    setChecked(newChecked);
    onToggleComplete?.(id, newChecked);
  };

  const formatDateRange = () => {
    const formatToken = "dd/MM/yyyy";
    const hasStartTime = startTime && startTime !== null;
    const hasEndTime = endTime && endTime !== null;
    
    if (hasStartTime && hasEndTime) {
      return `${format(new Date(startTime), formatToken)} - ${format(new Date(endTime), formatToken)}`;
    } else if (hasStartTime && !hasEndTime) {
      return `${format(new Date(startTime), formatToken)} - ?`;
    } else if (!hasStartTime && hasEndTime) {
      return `? - ${format(new Date(endTime), formatToken)}`;
    } else {
      return "";
    }
  };

  return (
    <View className="relative mx-4 my-2 rounded-2xl bg-white shadow-sm shadow-black/10 elevation-3 overflow-hidden">
      {/* 右侧动作条（在容器内绝对定位） */}
      <Animated.View
        style={rightActionStyle}
        // 仅打开时接收点击，否则禁用避免被上层拦截
        pointerEvents={actionsEnabled ? "auto" : "none"}
        className="absolute right-0 top-0 bottom-0 w-[72px] items-center justify-center z-10 pl-4"
      >
        <Animated.View
          pointerEvents="none"
          style={dividerStyle}  // 复用你已有的渐隐/渐显动画
          className="absolute left-3 top-1/2 -translate-y-1/2 w-[6px] h-[30px] bg-neutral-300 rounded-full"
        />
        <Pressable
          onPress={async () => {
            if (!onDelete) return;
            await onDelete(id);                // ✅ 触发删除
            translateX.value = withTiming(0); // 删除后收回
            runOnJS(setActionsEnabled)(false);
          }}
          android_ripple={{ color: "#e5e7eb", borderless: true }}
          className="w-[33px] h-[33px] rounded-full border-2 border-neutral-300 items-center justify-center"
        >
          <MaterialCommunityIcons name="trash-can-outline" size={22} color="#374151" />
        </Pressable>
      </Animated.View>

      {/* 可滑动的内容层（不再有圆角/阴影，视觉上属于同一张卡片） */}
      <GestureDetector gesture={pan}>
        <Animated.View style={cardContentStyle}>
          <Pressable onPress={onPress}>
            <View className="flex-row items-center p-5">
              {/* ✅ 左侧竖灰条（更靠左，形状更像设计稿）+ 勾选框 */}
              <Animated.View style={leftExtrasStyle} className="flex-row items-center mr-3">
                {/* 竖灰条 */}
                <View className="w-[6px] h-[30px] bg-neutral-300 rounded-full mr-3" />
                {/* 勾选框 */}
                <Pressable
                  onPress={handleToggleComplete}
                  className={`w-8 h-8 rounded-[10px] border-[3px] items-center justify-center mr-3 ${
                    checked ? "bg-neutral-300 border-neutral-300" : "bg-white border-gray-300"
                  }`}
                >
                  {checked && <View className="w-3 h-3 bg-white rounded-sm" />}
                </Pressable>
              </Animated.View>

              {/* Content */}
              <View className="flex-1">
                <Text className={`text-base font-bold ${checked ? "text-neutral-400 line-through" : "text-black"}`}>
                  {title}
                </Text>
                {!!formatDateRange() && (
                  <Text className="mt-1 text-[13px] text-neutral-400 font-semibold">
                    {formatDateRange()}
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
