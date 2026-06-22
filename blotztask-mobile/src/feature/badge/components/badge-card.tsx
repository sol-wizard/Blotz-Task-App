import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { BadgeDTO } from "../models/badge-dto";

interface BadgeCardProps {
  badge: BadgeDTO;
}

export function BadgeCard({ badge }: BadgeCardProps) {
  return (
    <View className="items-center">
      <View className="w-full aspect-square bg-lime-50 rounded-2xl items-center justify-center p-3">
        <Image
          source={{ uri: badge.iconUrl }}
          style={{ width: "100%", height: "100%" }}
          contentFit="contain"
        />
      </View>
      <Text
        className="text-sm font-baloo text-secondary text-center mt-2"
        numberOfLines={1}
      >
        {badge.title}
      </Text>
    </View>
  );
}
