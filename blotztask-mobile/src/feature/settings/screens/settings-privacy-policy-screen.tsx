import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

export default function SettingsPrivacyPolicyScreen() {
  const router = useRouter();
  const { t } = useTranslation("settings");

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 py-4">
        <Pressable onPress={() => router.back()} className="mr-4">
          <MaterialCommunityIcons name="arrow-left" size={24} color="#363853" />
        </Pressable>
        <Text className="text-2xl font-balooBold text-secondary">{t("about.privacyPolicy")}</Text>
      </View>

      <ScrollView className="flex-1 px-5">
        <View className="bg-white rounded-2xl p-6 mt-4">
          <Text className="text-base font-baloo text-gray-500">
            {t("about.privacyPolicyPlaceholder")}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
