import { Pressable, Text, View, Modal } from "react-native";
import { Image } from "expo-image";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";

type Props = {
  imageUri: string | null;
  isSharingImage: boolean;
  onShare: () => void;
  onClose: () => void;
};

export function MonthlyReviewSharePreviewSheet({
  imageUri,
  isSharingImage,
  onShare,
  onClose,
}: Props) {
  const { t } = useTranslation("settings");
  const isVisible = imageUri !== null;

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/45">
        <Pressable className="flex-1" onPress={onClose} />

        <View className="rounded-t-3xl bg-background px-5 pb-8 pt-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-xl font-balooBold text-secondary">
              {t("monthlyReview.previewTitle")}
            </Text>

            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-white"
            >
              <MaterialCommunityIcons name="close" size={20} color="#363853" />
            </Pressable>
          </View>

          <Text className="mb-4 text-sm font-baloo text-secondary/60">
            {t("monthlyReview.previewSubtitle")}
          </Text>

          <View className="items-center">
            <View className="overflow-hidden rounded-2xl bg-white">
              {imageUri && (
                <Image
                  source={{ uri: imageUri }}
                  // className="h-full w-full"
                  style={{ width: 188, height: 347 }}
                  contentFit="contain"
                />
              )}
            </View>
          </View>

          <View className="mt-5">
            <Pressable
              onPress={onShare}
              disabled={isSharingImage}
              className="h-12 flex-row items-center justify-center rounded-full bg-secondary"
              style={{ opacity: isSharingImage ? 0.6 : 1 }}
            >
              <MaterialCommunityIcons name="share-outline" size={20} color="#FFFFFF" />

              <Text className="ml-2 text-base font-balooBold text-white">
                {isSharingImage ? t("monthlyReview.sharing") : t("monthlyReview.shareNow")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
