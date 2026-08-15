import { Pressable, Text, View } from "react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

type Props = {
  // Default to the monthly copy; weekly passes its own title/body.
  title?: string;
  body?: string;
  showRecordToday?: boolean;
};

export function ReviewComingSoon({ title, body, showRecordToday = false }: Props) {
  const { t } = useTranslation("settings");
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center px-10">
      {showRecordToday ? (
        <MaterialCommunityIcons name="email-outline" size={40} color="#9AD513" />
      ) : (
        <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-white">
          <MaterialCommunityIcons name="email-outline" size={36} color="#9AD513" />
        </View>
      )}

      <Text
        className={`mb-2 text-center font-balooBold text-secondary ${
          showRecordToday ? "mt-6 text-base" : "text-xl"
        }`}
      >
        {title ?? t("monthlyReview.comingSoonTitle")}
      </Text>

      <Text className="text-center text-base font-baloo leading-6 text-secondary/70">
        {body ?? t("monthlyReview.comingSoonBody")}
      </Text>

      {showRecordToday && (
        <Pressable
          onPress={() => router.push("/task-create")}
          className="mt-8 rounded-full bg-highlight px-10 py-3"
        >
          <Text className="font-balooBold text-white">Record Today</Text>
        </Pressable>
      )}
    </View>
  );
}
