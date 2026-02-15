import React from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

export default function NewAiChatHubScreen() {
  return (
    <View className="flex-1">
      <Pressable className="absolute inset-0" onPress={() => router.back()} pointerEvents="auto" />
      <LinearGradient
        colors={["#8ACB22", "#49A35E", "#3B82F6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flex: 1,
          borderRadius: 28,
          height: 100,
        }}
      >
        <View style={{ alignItems: "flex-end" }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
            }}
            hitSlop={8}
          >
            <Text selectable style={{ color: "white", fontSize: 22 }}>
              ˅
            </Text>
          </Pressable>
          <View style={{ alignItems: "center", paddingBottom: 12 }}>
            <Text
              selectable
              style={{
                color: "white",
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 6,
              }}
            >
              Listening ...
            </Text>
            <Text selectable style={{ color: "white", fontSize: 13, opacity: 0.9 }}>
              Say everything you need to get done.
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}
