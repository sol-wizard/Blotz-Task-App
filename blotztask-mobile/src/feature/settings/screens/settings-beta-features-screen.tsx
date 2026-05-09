import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

export default function SettingsBetaFeaturesScreen() {
  const router = useRouter();
  const { t } = useTranslation("settings");

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 py-4">
        <Pressable onPress={() => router.back()} className="mr-4">
          <MaterialCommunityIcons name="arrow-left" size={24} color="#363853" />
        </Pressable>
        <Text className="text-2xl font-balooBold text-secondary">
          {t("betaFeatures.title")}
        </Text>
      </View>

      <View className="px-5 mt-4">
        <View className="bg-white rounded-2xl overflow-hidden">
          <Pressable
            onPress={() => router.push("/settings/all-tasks")}
            className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100"
          >
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="format-list-bulleted" size={22} color="#444964" />
              <Text className="text-lg font-baloo text-secondary ml-3">
                {t("betaFeatures.allTasks")}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#444964" />
          </Pressable>

          <Pressable
            onPress={() => router.push("/settings/membership-plan")}
            className="flex-row items-center justify-between px-6 py-4"
          >
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="brain" size={22} color="#444964" />
              <Text className="text-lg font-baloo text-secondary ml-3">
                {t("betaFeatures.membershipPlan")}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#444964" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
