import { Pressable, Text, View } from "react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";
import { REVIEW_ICON_COLOR } from "../constants/icon-colors";

type Props = {
  onBack: () => void;
  showShare: boolean;
  isSharing: boolean;
  onShare: () => void;
};

export function MonthlyReviewHeader({ onBack, showShare, isSharing, onShare }: Props) {
  const { t } = useTranslation("settings");

  return (
    <View className="flex-row items-center px-5 py-4">
      <Pressable onPress={onBack} className="mr-4">
        <MaterialCommunityIcons name="arrow-left" size={24} color={REVIEW_ICON_COLOR.secondary} />
      </Pressable>
      <Text className="flex-1 text-2xl font-balooBold text-secondary">
        {t("monthlyReview.title")}
      </Text>
      {showShare && (
        <Pressable
          onPress={onShare}
          disabled={isSharing}
          className={`h-10 flex-row items-center justify-center rounded-full bg-white px-3 ${
            isSharing ? "opacity-60" : "opacity-100"
          }`}
        >
          <MaterialCommunityIcons
            name="share-outline"
            size={18}
            color={REVIEW_ICON_COLOR.secondary}
          />
          <Text className="ml-1 text-sm font-balooBold text-secondary">
            {isSharing ? t("monthlyReview.sharing") : t("monthlyReview.share")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
