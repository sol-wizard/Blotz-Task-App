import { View, Text, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

const WEBSITE_URL = "https://blotz-website.vercel.app/";
const FEEDBACK_URL = "https://m3cetbcyp2d.usttp.larksuite.com/share/base/form/shrusf712jJdjDC4l6gJkXcc8Yf";

export default function SettingsAboutScreen() {
  const router = useRouter();
  const { t } = useTranslation("settings");

  const handleVisitWebsite = () => {
    Linking.openURL(WEBSITE_URL);
  };

  const handlePrivacyPolicy = () => {
    router.push("/settings/privacy-policy");
  };

  const handleFeedback = () => {
    Linking.openURL(FEEDBACK_URL);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 py-4">
        <Pressable onPress={() => router.back()} className="mr-4">
          <MaterialCommunityIcons name="arrow-left" size={24} color="#363853" />
        </Pressable>
        <Text className="text-2xl font-balooBold text-secondary">{t("about.title")}</Text>
      </View>

      <View className="px-5 mt-4">
        <View className="bg-white rounded-2xl overflow-hidden">
          <Pressable
            onPress={handleVisitWebsite}
            className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100"
          >
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="web" size={22} color="#444964" />
              <Text className="text-lg font-baloo text-secondary ml-3">
                {t("about.visitWebsite")}
              </Text>
            </View>
            <MaterialCommunityIcons name="open-in-new" size={20} color="#444964" />
          </Pressable>

          <Pressable
            onPress={handleFeedback}
            className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100"
          >
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="message-text-outline" size={22} color="#444964" />
              <Text className="text-lg font-baloo text-secondary ml-3">
                {t("about.feedback")}
              </Text>
            </View>
            <MaterialCommunityIcons name="open-in-new" size={20} color="#444964" />
          </Pressable>

          <Pressable
            onPress={handlePrivacyPolicy}
            className="flex-row items-center justify-between px-6 py-4"
          >
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="shield-check-outline" size={22} color="#444964" />
              <Text className="text-lg font-baloo text-secondary ml-3">
                {t("about.privacyPolicy")}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#444964" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
