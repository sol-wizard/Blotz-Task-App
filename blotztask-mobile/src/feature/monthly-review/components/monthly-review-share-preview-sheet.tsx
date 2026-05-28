import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Asset, requestPermissionsAsync } from "expo-media-library";
import { isAvailableAsync, shareAsync } from "expo-sharing";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";

type Props = {
  imageUri: string | null;
  onClose: () => void;
};

export function MonthlyReviewSharePreviewSheet({
  imageUri,
  onClose,
}: Props) {
  const { t } = useTranslation("settings");
  const [isSharing, setIsSharing] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);

  const handleShareImage = async () => {
    if (!imageUri || isSharing) {
      return;
    }

    setIsSharing(true);

    try {
      const isAvailable = await isAvailableAsync();

      if (!isAvailable) {
        Toast.show({ type: "error", text1: t("monthlyReview.shareErrorMessage") });
        return;
      }

      await shareAsync(imageUri, {
        mimeType: "image/png",
        UTI: "public.png",
      });
    } catch {
      Toast.show({ type: "error", text1: t("monthlyReview.shareErrorMessage") });
    } finally {
      setIsSharing(false);
    }
  };

  const handleSaveImage = async () => {
    if (!imageUri || isSavingImage) {
      return;
    }

    setIsSavingImage(true);

    try {
      const permission = await requestPermissionsAsync();

      if (!permission.granted) {
        Toast.show({ type: "error", text1: t("monthlyReview.savePermissionMessage") });
        return;
      }

      await Asset.create(imageUri);
      Toast.show({ type: "warning", text1: t("monthlyReview.saveSuccessMessage") });
    } catch {
      Toast.show({ type: "error", text1: t("monthlyReview.saveErrorMessage") });
    } finally {
      setIsSavingImage(false);
    }
  };

  return (
    <Modal visible={imageUri !== null} transparent animationType="slide" onRequestClose={onClose}>
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
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: 220, aspectRatio: 360 / 640 }}
                  contentFit="contain"
                />
              ) : (
                <View className="h-[391px] w-[220px] items-center justify-center">
                  <ActivityIndicator color="#363853" />
                </View>
              )}
            </View>
          </View>

          <View className="mt-5">
            <Pressable
              onPress={handleShareImage}
              disabled={isSharing}
              className="h-12 flex-row items-center justify-center rounded-full bg-secondary"
              style={{ opacity: isSharing ? 0.6 : 1 }}
            >
              <MaterialCommunityIcons name="share-outline" size={20} color="#FFFFFF" />
              <Text className="ml-2 text-base font-balooBold text-white">
                {isSharing ? t("monthlyReview.sharing") : t("monthlyReview.shareNow")}
              </Text>
            </Pressable>

            <View className="mt-3 flex-row">
              <Pressable
                onPress={handleSaveImage}
                disabled={isSavingImage}
                className="mr-2 h-12 flex-1 flex-row items-center justify-center rounded-full bg-white"
                style={{ opacity: isSavingImage ? 0.6 : 1 }}
              >
                <MaterialCommunityIcons name="download-outline" size={20} color="#363853" />
                <Text className="ml-2 text-sm font-balooBold text-secondary">
                  {isSavingImage ? t("monthlyReview.savingImage") : t("monthlyReview.saveImage")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
