import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useRouter } from "expo-router";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { ASSETS } from "@/shared/constants/assets";
import { FormDivider } from "@/shared/components/form-divider";
import { UserAvatar } from "@/shared/components/user-avatar";
import { SettingsMenuItem } from "@/feature/settings/modals/settings-menu-item";
import { useTranslation } from "react-i18next";

export default function SettingsScreen() {
  const router = useRouter();
  const { userProfile } = useUserProfile();
  const { t } = useTranslation("settings");

  const menuItems: SettingsMenuItem[] = [
    {
      key: "account",
      label: t("menu.account"),
      icon: "account-outline",
      route: "/settings/account",
    },
    {
      key: "monthly-review",
      label: t("menu.monthlyReview"),
      icon: "email-outline",
      route: "/settings/monthly-review",
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
    <SafeAreaView className="flex-1 bg-background py-4">
      <Text className="text-center text-4xl font-balooExtraBold text-secondary pt-2">
        {t("title")}
      </Text>

      <View className="flex-1 min-h-0 px-8 mt-2 w-full items-center">
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
              {index < menuItems.length - 1 && <FormDivider marginVertical={2} />}
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
