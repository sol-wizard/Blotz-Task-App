import { Pressable, Text, View } from "react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

type Props = {
  title: string;
  body: string;
};

export function ReviewComingSoon({ title, body }: Props) {
  const { t } = useTranslation("settings");
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center px-10">
      <View className=" h-20 w-20 items-center justify-center rounded-full bg-white">
        <MaterialCommunityIcons name="email-outline" size={36} color="#9AD513" />
      </View>

      <Text className="mb-2 mt-6 text-center text-base font-balooBold text-secondary">{title}</Text>

      <Text className="text-center text-base font-baloo leading-6 text-secondary/70">{body}</Text>

      <Pressable
        onPress={() => router.push("/task-create")}
        className="mt-8 rounded-full bg-highlight px-10 py-3"
      >
        <Text className="font-balooBold text-white">{t("monthlyReview.recordToday")}</Text>
      </Pressable>
    </View>
  );
}
