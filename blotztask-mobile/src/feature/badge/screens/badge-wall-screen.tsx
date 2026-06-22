import React from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";
import { useBadgesQuery } from "../hooks/useBadgesQuery";
import { BadgeCard } from "../components/badge-card";

export default function BadgeWallScreen() {
  const router = useRouter();
  const { t } = useTranslation("badge");
  const { badges } = useBadgesQuery();

  const sortedBadges = [...badges].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 py-4">
        <Pressable onPress={() => router.back()} className="mr-4">
          <MaterialCommunityIcons name="arrow-left" size={24} color="#444964" />
        </Pressable>
        <Text className="text-2xl font-balooBold text-secondary">{t("wall.title")}</Text>
      </View>

      <FlatList
        data={sortedBadges}
        keyExtractor={(badge) => badge.id.toString()}
        numColumns={3}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 16 }}
        columnWrapperStyle={{ gap: 16 }}
        renderItem={({ item }) => (
          <View className="flex-1">
            <BadgeCard badge={item} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}
