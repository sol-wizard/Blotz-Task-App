import { FormDivider } from "@/shared/components/ui/form-divider";
import { SettingsMenuItem } from "@/feature/settings/modals/settings-menu-item";
import { ReturnButton } from "@/shared/components/ui/return-button";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UnderDevelopmentScreen() {
  const router = useRouter();
  const { t } = useTranslation("settings");

  const menuItems: SettingsMenuItem[] = [
    {
      key: "under-development",
      label: t("underDevelopment.menu.allTasksPage"),
      icon: "format-list-checks",
      route: "/settings/all-tasks",
    },
    {
      key: "under-development",
      label: t("underDevelopment.menu.newAiChatHubTesting"),
      icon: "robot-outline",
      route: "/(protected)/new-ai-chat-hub",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background px-6 pt-3">
      <View className="flex-row items-center mb-6 min-h-10">
        <View className="w-6 items-start">
          <ReturnButton />
        </View>
        <View className="flex-1 items-center">
          <Text className="text-3xl font-balooExtraBold text-secondary text-center">
            {t("underDevelopment.title")}
          </Text>
        </View>
      </View>

      <View className="bg-white rounded-2xl px-4">
        {menuItems.map((item, index) => (
          <View key={`${item.key}-${index}`}>
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
    </SafeAreaView>
  );
}
