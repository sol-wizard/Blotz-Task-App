import { View, Text } from "react-native";
import { Image } from "expo-image";
import { BadgeDTO } from "../models/badge-preview-dto";

interface BadgeCardProps {
  badge: BadgeDTO;
  // When true, the icon sits directly on the page background (no tile).
  transparent?: boolean;
}

export function BadgeCard({ badge, transparent = false }: BadgeCardProps) {
  return (
    <View className="items-center">
      <View
        className={`w-full aspect-square rounded-2xl items-center justify-center p-3 ${
          transparent ? "" : "bg-lime-50"
        }`}
      >
        <Image
          source={{ uri: badge.iconUrl }}
          style={{ width: "100%", height: "100%" }}
          contentFit="contain"
        />
      </View>
      <Text className="text-sm font-baloo text-secondary text-center mt-2" numberOfLines={1}>
        {badge.name}
      </Text>
    </View>
  );
}
