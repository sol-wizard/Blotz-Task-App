import { View, Text, Pressable, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

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
        <LinearGradient
          colors={["#9AD513", "#60B000", "#9AD513"]}
          start={{ x: 0.8, y: 0 }}
          end={{ x: 0, y: 0.5 }}
          style={{
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 6,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text className="text-white font-baloo text-lg">
            {t("gashapon.pickNote")}
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
};