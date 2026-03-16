import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "@expo/vector-icons/build/MaterialCommunityIcons";

export const NoteHeader = () => {
  const { t } = useTranslation("notes");

  return (
    <View className="flex-row justify-between items-center mt-10 px-6">
      <Text className="text-4xl text-gray-800 font-balooExtraBold pt-4">
        {t("title")}
      </Text>

      <Pressable
        onPress={() => router.push("/(protected)/gashapon-machine")}
        className="rounded-full"
      >
        <View className="flex-row items-center bg-[#E9EEF0] rounded-[20px] px-4 py-1.5 justify-center">
          <MaterialCommunityIcons
            name="cursor-default-click-outline"
            size={16}
            color="#444964"
            style={{ marginRight: 5, transform: [{ scaleX: -1 }] }}
          />
          <Text className="text-gray-700 font-baloo text-lg">{t("gashapon.pickNote")}</Text>
        </View>
      </Pressable>
    </View>
  );
};