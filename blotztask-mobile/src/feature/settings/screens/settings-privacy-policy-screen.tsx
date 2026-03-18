import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

type ContentBlock = {
  type: "paragraph" | "header" | "subheader" | "subheader2" | "bullet" | "toc_title" | "toc";
  text: string;
};

export default function SettingsPrivacyPolicyScreen() {
  const router = useRouter();
  const { t } = useTranslation("privacyPolicy");

  const title = t("title");
  const updatedDate = t("updatedDate");
  const effectiveDate = t("effectiveDate");
  const blocks = t("content", { returnObjects: true }) as ContentBlock[];

  const renderBlock = (block: ContentBlock, index: number) => {
    switch (block.type) {
      case "header":
        return (
          <Text key={index} className="text-base font-balooBold text-secondary mt-6 mb-1">
            {block.text}
          </Text>
        );
      case "subheader":
        return (
          <Text key={index} className="text-sm font-balooBold text-secondary mt-4 mb-1">
            {block.text}
          </Text>
        );
      case "subheader2":
        return (
          <Text key={index} className="text-sm font-balooBold text-gray-600 mt-3 mb-1">
            {block.text}
          </Text>
        );
      case "toc_title":
        return (
          <Text key={index} className="text-sm font-balooBold text-secondary mt-4 mb-1">
            {block.text}
          </Text>
        );
      case "toc":
        return (
          <Text key={index} className="text-sm font-baloo text-gray-500 leading-5">
            {block.text}
          </Text>
        );
      case "bullet":
        return (
          <View key={index} className="flex-row mt-1 pr-2">
            <Text className="text-sm font-baloo text-gray-500 mr-2 mt-0.5">•</Text>
            <Text className="text-sm font-baloo text-gray-500 flex-1 leading-5">{block.text}</Text>
          </View>
        );
      case "paragraph":
      default:
        return (
          <Text key={index} className="text-sm font-baloo text-gray-500 mt-2 leading-5">
            {block.text}
          </Text>
        );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 py-4">
        <Pressable onPress={() => router.back()} className="mr-4">
          <MaterialCommunityIcons name="arrow-left" size={24} color="#363853" />
        </Pressable>
        <Text className="text-2xl font-balooBold text-secondary">{title}</Text>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="bg-white rounded-2xl p-5 mt-2">
          <Text className="text-xs font-baloo text-gray-400">{updatedDate}</Text>
          <Text className="text-xs font-baloo text-gray-400 mb-2">{effectiveDate}</Text>
          {blocks.map((block, index) => renderBlock(block, index))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
