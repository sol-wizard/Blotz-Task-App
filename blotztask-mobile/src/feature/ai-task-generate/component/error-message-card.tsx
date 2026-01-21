import { ASSETS } from "@/shared/constants/assets";
import { View, Text, Image } from "react-native";
import { useTranslation } from "react-i18next";

export const ErrorMessageCard = ({ errorMessage }: { errorMessage?: string }) => {
  const { t } = useTranslation("aiTaskGenerate");
  return (
    <View className="bg-background rounded-2xl px-4 py-2 w-96 flex-row items-center mt-10">
      <Text className="text-info text-xl font-balooBold w-72 px-2">
        {errorMessage?.trim() ? errorMessage : t("errors.default")}
      </Text>
      <Image source={ASSETS.greenBun} className="w-15 h-15" />
    </View>
  );
};
