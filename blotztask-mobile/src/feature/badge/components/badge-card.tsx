import { View, Text } from "react-native";
import { Image } from "expo-image";
import { BadgePreviewDTO } from "../models/badge-preview-dto";

interface BadgeCardProps {
  badge: BadgePreviewDTO;
  transparent?: boolean;
  slot?: number;
  pending?: boolean;
}

export function BadgeCard({ badge, transparent = false, slot, pending = false }: BadgeCardProps) {
  return (
    <View className={`items-center ${pending ? "opacity-40" : ""}`}>
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

        {slot !== undefined && (
          <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border-2 border-highlight items-center justify-center">
            <Text
              className="font-balooBold text-highlight"
              style={{ fontSize: 15, textAlign: "center" }}
            >
              {slot}
            </Text>
          </View>
        )}
      </View>
      <Text className="text-sm font-baloo text-secondary text-center mt-2" numberOfLines={1}>
        {badge.name}
      </Text>
    </View>
  );
}
