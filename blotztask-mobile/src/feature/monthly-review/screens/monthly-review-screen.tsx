import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { CustomSpinner } from "@/shared/components/custom-spinner";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";
import { addMonths, isSameMonth, startOfMonth } from "date-fns";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { LetterBody } from "../components/letter-body";
import { LetterEmptyState } from "../components/letter-empty-state";
import { LetterHeader } from "../components/letter-header";
import { LetterSignature } from "../components/letter-signature";
import { MonthSelector } from "../components/month-selector";
import { MonthlyReviewShareCard } from "../components/monthly-review-share-card";
import { useMonthlyReport } from "../hooks/useMonthlyReport";
import { formatMonth } from "../utils/month-utils";

type ViewShotModule = typeof import("react-native-view-shot");
type MediaLibraryModule = typeof import("expo-media-library");
type ClipboardModule = typeof import("expo-clipboard");

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

export default function MonthlyReviewScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation("settings");
  const { userProfile } = useUserProfile();
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [isSharing, setIsSharing] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [isCopyingCaption, setIsCopyingCaption] = useState(false);
  const [hasCopiedCaption, setHasCopiedCaption] = useState(false);
  const shareCardRef = useRef<View>(null);
  const isAtCurrentMonth = isSameMonth(selectedMonth, new Date());
  const { report, isLoading, generate, isGenerating } = useMonthlyReport(selectedMonth);

  const displayMonth = formatMonth(selectedMonth, i18n.language);
  const recipientName = userProfile?.displayName ?? "Friend";
  const shareTitle = t("monthlyReview.shareTitle", { month: displayMonth });
  const shareCaption = t("monthlyReview.shareCaption", { month: displayMonth });

  const closeSharePreview = () => {
    setPreviewImageUri(null);
    setHasCopiedCaption(false);
  };

  const handleShareMonthlyReview = async () => {
    if (!report || !shareCardRef.current || isSharing) {
      return;
    }

    setIsSharing(true);

    try {
      const { captureRef } = (await import("react-native-view-shot")) as ViewShotModule;
      const uri = await captureRef(shareCardRef.current, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      setPreviewImageUri(uri);
    } catch (error: unknown) {
      console.error("Failed to prepare monthly review image", getErrorMessage(error));
      Alert.alert(t("monthlyReview.shareErrorTitle"), t("monthlyReview.shareErrorMessage"));
    } finally {
      setIsSharing(false);
    }
  };

  const handleSharePreviewImage = async () => {
    if (!previewImageUri) {
      return;
    }

    try {
      await Share.share({
        title: shareTitle,
        url: previewImageUri,
      });
    } catch (error: unknown) {
      console.error("Failed to share monthly review image", getErrorMessage(error));
      Alert.alert(t("monthlyReview.shareErrorTitle"), t("monthlyReview.shareErrorMessage"));
    }
  };

  const handleSavePreviewImage = async () => {
    if (!previewImageUri || isSavingImage) {
      return;
    }

    setIsSavingImage(true);

    try {
      const MediaLibrary = (await import("expo-media-library")) as MediaLibraryModule;
      const permission = await MediaLibrary.requestPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          t("monthlyReview.savePermissionTitle"),
          t("monthlyReview.savePermissionMessage"),
        );
        return;
      }

      await MediaLibrary.saveToLibraryAsync(previewImageUri);
      Alert.alert(t("monthlyReview.saveSuccessTitle"), t("monthlyReview.saveSuccessMessage"));
    } catch (error: unknown) {
      console.error("Failed to save monthly review image", getErrorMessage(error));
      Alert.alert(t("monthlyReview.saveErrorTitle"), t("monthlyReview.saveErrorMessage"));
    } finally {
      setIsSavingImage(false);
    }
  };

  const handleCopyCaption = async () => {
    if (isCopyingCaption) {
      return;
    }

    setIsCopyingCaption(true);

    try {
      const Clipboard = (await import("expo-clipboard")) as ClipboardModule;
      await Clipboard.setStringAsync(shareCaption);
      setHasCopiedCaption(true);
    } catch (error: unknown) {
      console.error("Failed to copy monthly review caption", getErrorMessage(error));
      Alert.alert(t("monthlyReview.copyErrorTitle"), t("monthlyReview.copyErrorMessage"));
    } finally {
      setIsCopyingCaption(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 py-4">
        <Pressable onPress={() => router.back()} className="mr-4">
          <MaterialCommunityIcons name="arrow-left" size={24} color="#363853" />
        </Pressable>
        <Text className="flex-1 text-2xl font-balooBold text-secondary">
          {t("monthlyReview.title")}
        </Text>
        {report && (
          <Pressable
            onPress={handleShareMonthlyReview}
            disabled={isSharing}
            className="h-10 px-3 rounded-full bg-white flex-row items-center justify-center"
            style={{ opacity: isSharing ? 0.6 : 1 }}
          >
            <MaterialCommunityIcons name="share-outline" size={18} color="#363853" />
            <Text className="ml-1 text-sm font-balooBold text-secondary">
              {isSharing ? t("monthlyReview.sharing") : t("monthlyReview.share")}
            </Text>
          </Pressable>
        )}
      </View>
      <View className="px-5 mb-4">
        <MonthSelector
          label={displayMonth}
          onPrev={() => setSelectedMonth((m) => addMonths(m, -1))}
          onNext={() => {
            if (!isAtCurrentMonth) setSelectedMonth((m) => addMonths(m, 1));
          }}
          disableNext={isAtCurrentMonth}
        />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View className="px-5">
          <View className="rounded-3xl px-7 pt-7 pb-8" style={{ backgroundColor: "#FFFBF3" }}>
            <LetterHeader displayMonth={displayMonth} />
            {isLoading ? (
              // TODO: replace with a shared inline loading component once one exists.
              (<View className="py-12 items-center">
                <CustomSpinner size={48} />
                <Text className="text-base font-baloo text-secondary/60 mt-3 text-center">
                  {t("monthlyReview.loading")}
                </Text>
              </View>)
            ) : report ? (
              <>
                <LetterBody recipientName={recipientName} body={report.aiGeneratedLetter} />
                <LetterSignature />
              </>
            ) : (
              <>
                <LetterEmptyState />
                {/* TODO: temporary test button — remove once PBI 8A scheduled trigger is in place. */}
                <View className="items-center mb-6">
                  <Pressable
                    onPress={() => generate()}
                    disabled={isGenerating}
                    className="px-5 py-2 rounded-full bg-secondary"
                    style={{ opacity: isGenerating ? 0.6 : 1 }}
                  >
                    <Text className="text-white font-balooBold">
                      {isGenerating ? t("monthlyReview.loading") : t("monthlyReview.generate")}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>

          <Text className="text-xs font-baloo text-secondary/50 text-center mt-8 px-4">
            {t("monthlyReview.footnote")}
          </Text>
        </View>
      </ScrollView>

      {report && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: -10000, top: 0 }}
          collapsable={false}
        >
          <View ref={shareCardRef} collapsable={false}>
            <MonthlyReviewShareCard
              displayMonth={displayMonth}
              recipientName={recipientName}
              body={report.aiGeneratedLetter}
            />
          </View>
        </View>
      )}

      <Modal
        visible={previewImageUri !== null}
        transparent
        animationType="slide"
        onRequestClose={closeSharePreview}
      >
        <View className="flex-1 justify-end bg-black/45">
          <Pressable className="flex-1" onPress={closeSharePreview} />
          <View className="rounded-t-3xl bg-background px-5 pt-4 pb-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-balooBold text-secondary">
                {t("monthlyReview.previewTitle")}
              </Text>
              <Pressable
                onPress={closeSharePreview}
                className="w-9 h-9 rounded-full bg-white items-center justify-center"
              >
                <MaterialCommunityIcons name="close" size={20} color="#363853" />
              </Pressable>
            </View>

            <Text className="text-sm font-baloo text-secondary/60 mb-4">
              {t("monthlyReview.previewSubtitle")}
            </Text>

            <View className="items-center">
              <View className="rounded-2xl overflow-hidden bg-white">
                {previewImageUri ? (
                  <Image
                    source={{ uri: previewImageUri }}
                    style={{ width: 220, aspectRatio: 360 / 640 }}
                    contentFit="contain"
                  />
                ) : (
                  <View className="w-[220px] h-[391px] items-center justify-center">
                    <ActivityIndicator color="#363853" />
                  </View>
                )}
              </View>
            </View>

            <View className="mt-5">
              <Pressable
                onPress={handleSharePreviewImage}
                className="h-12 rounded-full bg-secondary flex-row items-center justify-center"
              >
                <MaterialCommunityIcons name="share-outline" size={20} color="#FFFFFF" />
                <Text className="ml-2 text-base font-balooBold text-white">
                  {t("monthlyReview.shareNow")}
                </Text>
              </Pressable>

              <View className="flex-row mt-3">
                <Pressable
                  onPress={handleSavePreviewImage}
                  disabled={isSavingImage}
                  className="flex-1 h-12 rounded-full bg-white flex-row items-center justify-center mr-2"
                  style={{ opacity: isSavingImage ? 0.6 : 1 }}
                >
                  <MaterialCommunityIcons name="download-outline" size={20} color="#363853" />
                  <Text className="ml-2 text-sm font-balooBold text-secondary">
                    {isSavingImage ? t("monthlyReview.savingImage") : t("monthlyReview.saveImage")}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleCopyCaption}
                  disabled={isCopyingCaption}
                  className="flex-1 h-12 rounded-full bg-white flex-row items-center justify-center ml-2"
                  style={{ opacity: isCopyingCaption ? 0.6 : 1 }}
                >
                  <MaterialCommunityIcons
                    name={hasCopiedCaption ? "check" : "content-copy"}
                    size={19}
                    color="#363853"
                  />
                  <Text className="ml-2 text-sm font-balooBold text-secondary">
                    {hasCopiedCaption
                      ? t("monthlyReview.copiedCaption")
                      : t("monthlyReview.copyCaption")}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
