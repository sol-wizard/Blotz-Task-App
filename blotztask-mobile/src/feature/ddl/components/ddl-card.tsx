import { DdlDTO } from "../models/ddl-dto";
import { format, parseISO } from "date-fns";
import React, { useState } from "react";
import { View, Pressable, Text, useWindowDimensions } from "react-native";
import TasksCheckbox from "@/feature/task-details/components/task-checkbox";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { MotionAnimations } from "@/shared/constants/animations/motion";

const rubberBand = (x: number, limit: number) => {
  "worklet";
  if (x >= 0) return 0;
  if (x < limit) {
    const extra = x - limit;
    return limit + extra * 0.25;
  }
  return x;
};

interface DdlCardProps {
  ddl: DdlDTO;
}

const DdlCard = ({ ddl }: DdlCardProps) => {
  const { width: screenWidth } = useWindowDimensions();

  const cardTranslateX = useSharedValue(0);

  const [actionHeight, setActionHeight] = useState(0);

  const widthInfo = React.useMemo(() => {
    const pinWidth = 72;
    const deleteWidth = 72;
    const spacerWidth = 8;
    const totalWidth = spacerWidth + pinWidth + spacerWidth + deleteWidth;
    return {
      openX: -totalWidth,
      openThreshold: totalWidth * 0.5,
      pinWidth,
      deleteWidth,
    };
  }, []);

  const isLoading = false;

  const navigateToTaskDetails = (item: DdlDTO) => {
    console.log("Navigate to Task Detail", item.id);
  };

  const pan = Gesture.Pan()
    .enabled(!isLoading)
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      cardTranslateX.value = rubberBand(e.translationX, widthInfo.openX);
    })
    .onEnd(() => {
      const open = Math.abs(cardTranslateX.value) > widthInfo.openThreshold;
      cardTranslateX.value = withSpring(open ? widthInfo.openX : 0, {
        damping: 16,
        stiffness: 220,
        mass: 0.9,
      });
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: cardTranslateX.value }],
  }));

  const leftExtrasStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: cardTranslateX.value * 1.25 }],
  }));

  const remainingDays = Math.max(
    0,
    Math.ceil((new Date(ddl.dueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <Animated.View
      className="mx-4 my-2"
      layout={MotionAnimations.layout}
      exiting={MotionAnimations.rightExiting}
      entering={MotionAnimations.upEntering}
    >
      <GestureDetector gesture={pan}>
        <Animated.View style={cardStyle} className="flex-row items-start">
          <View 
            style={{ 
              width: screenWidth - 32,
              shadowColor: "#000000",
              shadowOffset: { width: 6, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 10,
              elevation: 10,           
            }}
            className="rounded-2xl"
          >
            <Pressable
              onPress={() => navigateToTaskDetails(ddl)}
              disabled={isLoading}
              className="bg-white rounded-2xl overflow-hidden"
            >
              <View onLayout={(e) => setActionHeight(e.nativeEvent.layout.height)}>
                <View className={`flex-row items-center p-4 ${isLoading ? "opacity-70" : ""}`}>
                  <Animated.View style={leftExtrasStyle} className="flex-row items-center mr-3">
                    <TasksCheckbox
                      checked={ddl.isDone}
                      disabled={isLoading}
                      size={30}
                      className="border-2"
                      uncheckedColor="#D1D5DB"
                      onChange={() => {
                          console.log("Toggle done", ddl.id);
                        }}
                    />
                    <View className="w-[5px] h-10 rounded-full mx-3 bg-blue-200" />
                  </Animated.View>

                  <View className="flex-1 flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text
                        className={`text-xl font-baloo ${
                          ddl.isDone ? "text-neutral-400 line-through" : "text-black"
                        }`}
                        style={
                          ddl.isDone
                            ? {
                                textDecorationLine: "line-through",
                                textDecorationColor: "#9CA3AF",
                              }
                            : undefined
                        }
                        numberOfLines={1}
                      >
                        {ddl.title}
                      </Text>

                      <Text className="mt-1 text-[13px] text-neutral-400 font-semibold">
                        {format(parseISO(ddl.dueAt), "dd/MM/yy")}
                      </Text>
                    </View>

                    <View className="ml-3 flex-row items-baseline">
                      <Text className="font-baloo text-5xl text-primary" style={{ color: "#4d4848", lineHeight: 50, transform: [{ translateY: 8 }, { translateX: -10 }]}}>
                        {remainingDays}
                      </Text>
                      <Text className="font-baloo ml-1 text-sm text-neutral-400" style={{ transform: [{ translateY: 8 }, { translateX: -10 }] }}>
                        days
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </Pressable>
          </View>

          <View className="w-2" />

          <View
            style={{
              width: widthInfo.pinWidth,
              height: actionHeight || 80,
              backgroundColor: "#E6F6D5",
              shadowColor: "#000000",
              shadowOffset: { width: 6, height: 8 },
              shadowOpacity: 0.18,
              shadowRadius: 10,
              elevation: 10,
            }}
            pointerEvents="auto"
            className="rounded-xl"
          >
            <Pressable
              onPress={() => {
                if (isLoading) return;
                console.log("Pin to Top", ddl.id);
                cardTranslateX.value = withTiming(0, { duration: 160 });
              }}
              disabled={isLoading}
              android_ripple={{ color: "#DCFCE7", borderless: false }}
              style={{ width: "100%", height: actionHeight || 80 }}
              className="rounded-xl bg-green-500/10 items-center justify-center overflow-hidden"
            >
              <MaterialCommunityIcons name="arrow-collapse-up" size={24} color="#84CC16" />
            </Pressable>
          </View>

          <View className="w-2" />

          <View
            style={{
              width: widthInfo.deleteWidth,
              height: actionHeight || 80,
              backgroundColor: "#FFE1E1",
              shadowColor: "#000000",
              shadowOffset: { width: 6, height: 8 },
              shadowOpacity: 0.18,
              shadowRadius: 10,
              elevation: 10,
            }}
            pointerEvents="auto"
            className="rounded-xl"
          >
            <Pressable
              onPress={() => {
                if (isLoading) return;
                console.log("Delete", ddl.id);
                cardTranslateX.value = withTiming(0, { duration: 160 });
              }}
              disabled={isLoading}
              android_ripple={{ color: "#FEE2E2", borderless: false }}
              style={{ width: "100%", height: actionHeight || 80 }}
              className="rounded-xl bg-red-500/10 items-center justify-center overflow-hidden"
            >
              <MaterialCommunityIcons name="trash-can-outline" size={24} color="#F56767" />
            </Pressable>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};

export default React.memo(DdlCard);