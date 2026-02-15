import React from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function NewAiChatHubScreen() {
  const { height } = useWindowDimensions();

  return (
    <View className="flex-1 bg-transparent">
      <Pressable className="absolute inset-0" onPress={() => router.back()} pointerEvents="auto" />
      <View className="flex-1 justify-end">
        <LinearGradient
          colors={["#8ACB22", "#49A35E", "#3B82F6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            height: height * 0.84,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 24,
          }}
          pointerEvents="auto"
        >
          <View className="items-end">
            <Pressable
              onPress={() => router.back()}
              className="items-center justify-center"
              hitSlop={10}
            >
              <MaterialCommunityIcons name="chevron-down" size={30} color="#FFFFFF" />
            </Pressable>
          </View>
          <View className="flex-1 items-center justify-center">
            <Text selectable className="mb-2 text-xl font-semibold text-white">
              Listening ...
            </Text>
            <Text selectable className="text-[13px] text-white/90">
              Say everything you need to get done.
            </Text>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}
