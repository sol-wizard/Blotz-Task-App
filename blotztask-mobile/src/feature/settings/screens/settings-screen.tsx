import React, { useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useFocusEffect, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { badgeKeys } from "@/shared/constants/query-key-factory";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { ASSETS } from "@/shared/constants/assets";
import { FormDivider } from "@/shared/components/form-divider";
import { UserAvatar } from "@/shared/components/user-avatar";
import { SettingsMenuItem } from "@/feature/settings/modals/settings-menu-item";
import { BadgePreviewSection } from "@/feature/settings/components/badge-preview-section";
import { useTranslation } from "react-i18next";
import { useBadgesQuery } from "@/feature/badge/hooks/useBadgesQuery";
import LoadingScreen from "@/shared/components/loading-screen";
import { analytics } from "@/shared/services/analytics";
import { SCREEN_NAMES } from "@/shared/constants/posthog-events";

export default function SettingsScreen() {
  useFocusEffect(
    useCallback(() => {
      analytics.trackScreenViewed(SCREEN_NAMES.SETTINGS);
    }, []),
  );

  const router = useRouter();
  const { userProfile, isUserProfileLoading } = useUserProfile();
  const { t } = useTranslation("settings");
  const { badges, isLoading: areBadgesLoading } = useBadgesQuery();
  const queryClient = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: badgeKeys.all });
    }, [queryClient]),
  );

  if (isUserProfileLoading || areBadgesLoading) {
    return <LoadingScreen />;
  }

  const menuItems: SettingsMenuItem[] = [
    {
      key: "account",
      label: t("menu.account"),
      icon: "account-outline",
      route: "/settings/account",
    },
    {
      key: "review",
      label: t("menu.review"),
      icon: "email-outline",
      route: "/settings/review",
    },
    {
      key: "beta-features",
      label: t("menu.betaFeatures"),
      icon: "flask-outline",
      route: "/settings/beta-features",
    },
    {
      key: "task-handling",
      label: t("menu.taskHandling"),
      icon: "file-check-outline",
      route: "/settings/task-handling",
    },
    {
      key: "notifications",
      label: t("menu.notifications"),
      icon: "bell-outline",
      route: "/settings/notifications",
    },
    {
      key: "language",
      label: t("menu.language"),
      icon: "translate",
      route: "/settings/language",
    },
    {
      key: "invite",
      label: t("menu.invite"),
      icon: "account-plus-outline",
      route: "/settings/invite",
    },
    {
      key: "about",
      label: t("menu.about"),
      icon: "information-outline",
      route: "/settings/about",
    },
  ];

  const handleProfileEdit = () => {
    router.push("/settings/avatar" as const);
  };

  return (
    <SafeAreaView className="flex-1 bg-background pt-4" edges={["top"]}>
      <Text className="text-center text-4xl font-balooExtraBold text-secondary pt-2">
        {t("title")}
      </Text>

      <ScrollView
        className="flex-1 mt-2"
        contentContainerStyle={{ paddingHorizontal: 32, alignItems: "center", paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <UserAvatar pictureValue={userProfile?.pictureUrl} size={96} />
          <Pressable
            onPress={handleProfileEdit}
            className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-white items-center justify-center"
          >
            <ASSETS.editIcon width={18} height={18} fill="#444964" />
          </Pressable>
        </View>
        <Text className="text-2xl font-balooBold text-secondary mt-5">
          {userProfile?.displayName}
        </Text>
        {badges.length > 0 && <BadgePreviewSection badges={badges} />}
        <View className="bg-white w-full pl-4 rounded-2xl mt-4">
          {menuItems.map((item, index) => (
            <View key={item.key} className="w-11/12">
              <Pressable
                onPress={() => router.push(item.route)}
                className="flex-row items-center justify-between pl-4 py-4"
              >
                <View className="flex-row items-center">
                  <MaterialCommunityIcons name={item.icon} size={22} color="#444964" />
                  <Text className="text-lg font-baloo text-secondary ml-3">{item.label}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color="#444964" />
              </Pressable>
              {index < menuItems.length - 1 && (
                <FormDivider marginVertical={2} animateLayout={false} />
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
