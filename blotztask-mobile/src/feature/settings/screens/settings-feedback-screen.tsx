import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useForm, useWatch } from "react-hook-form";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";
import { FormTextInput } from "@/shared/components/form-text-input";
import { useSubmitFeedbackMutation } from "../hooks/useSubmitFeedbackMutation";
import { compressFeedbackImage } from "../util/compress-feedback-image";
import { FeedbackImage } from "../modals/feedback-image";
import { analytics } from "@/shared/services/analytics";
import { SCREEN_NAMES } from "@/shared/constants/posthog-events";

const MAX_TEXT_LENGTH = 500;

type FeedbackFormField = {
  text: string;
};

export default function SettingsFeedbackScreen() {
  const router = useRouter();
  const { t } = useTranslation("settings");
  const { control, handleSubmit } = useForm<FeedbackFormField>({ defaultValues: { text: "" } });
  const text = useWatch({ control, name: "text" });
  const [image, setImage] = useState<FeedbackImage | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const { submitFeedback, isSubmitting } = useSubmitFeedbackMutation();

  useEffect(() => {
    analytics.trackScreenViewed(SCREEN_NAMES.SETTINGS_FEEDBACK);
  }, []);

  // A ref, not state, so a fast double tap can't send twice before the re-render.
  const isSendingRef = useRef(false);

  const canSubmit = text.trim().length > 0 && !isSubmitting && !isProcessingImage;
  const canEditImage = !isSubmitting && !isProcessingImage;

  const handlePickImage = async () => {
    setIsProcessingImage(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] });
      const picked = result.assets?.[0];
      if (result.canceled || !picked) return;

      setImage(await compressFeedbackImage(picked.uri, picked.width, picked.height));
    } catch {
      Toast.show({ type: "error", text1: t("feedback.imageError") });
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleFormSubmit = async (data: FeedbackFormField) => {
    if (!canSubmit || isSendingRef.current) return;
    isSendingRef.current = true;
    try {
      await submitFeedback({ text: data.text.trim(), image });
    } catch {
      // The global mutation toast shows the error; the text stays so the user can retry.
      return;
    } finally {
      isSendingRef.current = false;
    }
    Toast.show({ type: "success", text1: t("feedback.success") });
    router.back();
  };

  // Built on press, not during render, because handleFormSubmit reads a ref.
  const handlePressSubmit = () => handleSubmit(handleFormSubmit)();

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center px-5 py-4">
          <Pressable onPress={() => router.back()} className="mr-4">
            <MaterialCommunityIcons name="arrow-left" size={24} color="#444964" />
          </Pressable>
          <Text className="text-2xl font-balooBold text-secondary">{t("feedback.title")}</Text>
        </View>

        <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled">
          <View className="bg-white rounded-2xl px-4 py-3 mt-4">
            <FormTextInput
              name="text"
              placeholder={t("feedback.placeholder")}
              control={control}
              className="font-baloo text-lg text-secondary min-h-40"
              inputProps={{ maxLength: MAX_TEXT_LENGTH, textAlignVertical: "top" }}
            />
            <Text className="text-sm font-baloo text-secondary/50 text-right">
              {text.length} / {MAX_TEXT_LENGTH}
            </Text>
          </View>

          <View className="bg-white rounded-2xl px-4 py-3 mt-4">
            {image ? (
              <View className="flex-row items-center">
                <Image
                  source={{ uri: image.uri }}
                  style={{ width: 64, height: 64, borderRadius: 8 }}
                />
                <Pressable onPress={() => setImage(null)} disabled={!canEditImage} className="ml-4">
                  <Text className="text-base font-baloo text-secondary">
                    {t("feedback.removeImage")}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handlePickImage}
                disabled={!canEditImage}
                className="flex-row items-center"
              >
                <MaterialCommunityIcons name="image-plus" size={22} color="#444964" />
                <Text className="text-base font-baloo text-secondary ml-3">
                  {isProcessingImage ? t("feedback.processingImage") : t("feedback.addImage")}
                </Text>
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={handlePressSubmit}
            disabled={!canSubmit}
            className={`w-full py-4 mt-6 rounded-xl items-center justify-center ${
              canSubmit ? "bg-lime-300" : "bg-gray-300"
            }`}
          >
            <Text className="font-balooBold text-xl text-black">
              {isSubmitting ? t("feedback.submitting") : t("feedback.submit")}
            </Text>
          </Pressable>

          <Text className="text-xs font-baloo text-secondary/50 text-center mt-3">
            {t("feedback.accountNote")}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
