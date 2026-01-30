import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { PNGIMAGES } from "@/shared/constants/assets";
import { FormDivider } from "@/shared/components/ui/form-divider";
import { SettingsMenuItem } from "@/feature/settings/modals/settings-menu-item";
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";

export default function SettingsScreen() {
  const router = useRouter();
  const { userProfile } = useUserProfile();
  const { t } = useTranslation("settings");

  const menuItems: SettingsMenuItem[] = [
    {
      key: "account",
      label: t("menu.account"),
      icon: "account-outline",
      route: "/(protected)/settings/account",
    },
    {
      key: "task-handling",
      label: t("menu.taskHandling"),
      icon: "file-check-outline",
      route: "/(protected)/settings/task-handling",
    },
    {
      key: "notifications",
      label: t("menu.notifications"),
      icon: "bell-outline",
      route: "/(protected)/settings/notifications",
    },
    {
      key: "language",
      label: t("menu.language"),
      icon: "translate",
      route: "/(protected)/settings/language",
    },
    {
      key: "under-development",
      label: t("menu.allTasks"),
      icon: "cog-outline",
      route: "/(protected)/settings/all-tasks",
    },
  ];

  const avatarSource = userProfile?.pictureUrl
    ? { uri: userProfile.pictureUrl }
    : PNGIMAGES.blotzIcon;

  const handleProfileEdit = () => {
    router.push("/(protected)/settings/avatar" as const);
  };

  return (
    <SafeAreaView className="flex-1 bg-background py-4">
      <Text className="text-center text-4xl font-balooExtraBold text-secondary pt-2">
        {t("title")}
      </Text>

      <View className="px-8 mt-2 w-full items-center">
        <View>
          <Image
            source={avatarSource}
            style={{ width: 96, height: 96, borderRadius: 48 }}
            contentFit="cover"
          />
          <Pressable
            onPress={handleProfileEdit}
            className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-white items-center justify-center"
          >
            <MaterialCommunityIcons name="pencil-minus-outline" size={18} color="#363853" />
          </Pressable>
        </View>
        <Text className="text-2xl font-balooBold text-secondary mt-5">
          {userProfile?.displayName}
        </Text>
        <Text className="text-base font-baloo text-gray-500 mt-1">{t("version")}</Text>

        <View className="mt-8 w-full bg-white rounded-2xl items-center">
          {menuItems.map((item, index) => (
            <View key={item.key} className="w-11/12">
              <Pressable
                onPress={() => router.push(item.route)}
                className="flex-row items-center justify-between px-4 py-4"
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
