import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useKeyboardState } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { useForm, useWatch } from "react-hook-form";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";
import { useDebouncedCallback } from "use-debounce";
import { FormTextInput } from "@/shared/components/form-text-input";
import { HoldToTalkPill } from "@/feature/ai-task-generate/component/hold-to-talk-pill";
import { MicPermissionHint } from "@/feature/ai-task-generate/component/mic-permission-hint";
import { useVoiceRecorder } from "@/feature/ai-task-generate/hooks/useVoiceRecorder";
import { useMicPermission } from "@/feature/ai-task-generate/hooks/useMicPermission";
import { useSubmitFeedbackMutation } from "../hooks/useSubmitFeedbackMutation";
import { useTranscribeFeedbackMutation } from "../hooks/useTranscribeFeedbackMutation";
import { appendTranscript } from "../util/append-transcript";
import { compressFeedbackImage } from "../util/compress-feedback-image";
import { FeedbackImage } from "../modals/feedback-image";
import { analytics } from "@/shared/services/analytics";
import { SCREEN_NAMES } from "@/shared/constants/posthog-events";

const MAX_TEXT_LENGTH = 500;
// Same as the AI sheet: shorter presses are accidental taps and are thrown away.
const MIN_HOLD_MS = 300;
// Same as the AI sheet: how long the "mic is off" reason replaces the caption.
const HINT_AUTO_HIDE_MS = 2500;

type FeedbackFormField = {
  text: string;
};

export default function SettingsFeedbackScreen() {
  const router = useRouter();
  const { t } = useTranslation("settings");
  const { t: tVoice } = useTranslation("aiTaskGenerate");
  const { control, handleSubmit, getValues, setValue } = useForm<FeedbackFormField>({
    defaultValues: { text: "" },
  });
  const text = useWatch({ control, name: "text" });
  const [image, setImage] = useState<FeedbackImage | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const { submitFeedback, isSubmitting } = useSubmitFeedbackMutation();
  const textInputRef = useRef<TextInput>(null);
  const { isVisible: isKeyboardVisible } = useKeyboardState();
  const { transcribeFeedback, isTranscribing } = useTranscribeFeedbackMutation();

  // The transcript is added after what is already typed; errors are toasted by the global handler.
  const addSpokenText = async (uri: string) => {
    const transcript = await transcribeFeedback(uri);
    const combined = appendTranscript(getValues("text"), transcript, MAX_TEXT_LENGTH);
    setValue("text", combined, { shouldDirty: true });
  };

  const { isRecording, startListening, stopAndUpload, cancelListening } =
    useVoiceRecorder(addSpokenText);
  const { isMicUsable, isMicRefused, needsSettings, requestMic, openSettings } = useMicPermission();
  // A blocked mic shows no system prompt, so the hint states the reason for a moment instead.
  const [isMicDisabledReasonVisible, setIsMicDisabledReasonVisible] = useState(false);
  const hideMicDisabledReasonLater = useDebouncedCallback(
    () => setIsMicDisabledReasonVisible(false),
    HINT_AUTO_HIDE_MS,
  );

  // Refs, not state: they are read in the release handler of the same press.
  const hasStartedRecording = useRef(false);
  const heldLongEnough = useRef(false);

  useEffect(() => {
    analytics.trackScreenViewed(SCREEN_NAMES.SETTINGS_FEEDBACK);
  }, []);

  // A ref, not state, so a fast double tap can't send twice before the re-render.
  const isSendingRef = useRef(false);

  const isVoiceBusy = isRecording || isTranscribing;
  const canSubmit = text.trim().length > 0 && !isSubmitting && !isProcessingImage && !isVoiceBusy;
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

  const handleMicPressIn = async () => {
    heldLongEnough.current = false;
    if (!isMicUsable) {
      // The system prompt takes over this press; the next hold records.
      const status = await requestMic();
      if (status === "blocked") {
        setIsMicDisabledReasonVisible(true);
        hideMicDisabledReasonLater();
      }
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    hasStartedRecording.current = true;
    startListening();
  };

  const handleMicRelease = () => {
    if (!hasStartedRecording.current) return;
    hasStartedRecording.current = false;

    if (heldLongEnough.current) {
      void stopAndUpload();
      return;
    }
    void cancelListening();
    Toast.show({ type: "info", text1: tVoice("errors.holdLonger") });
  };

  const markHeldLongEnough = () => {
    heldLongEnough.current = true;
  };

  // Voice comes first; "Aa" opens the keyboard, and the same button closes it again.
  const handleToggleKeyboard = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
    } else {
      textInputRef.current?.focus();
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="flex-row items-center px-5 py-4">
          <Pressable onPress={() => router.back()} className="mr-4">
            <MaterialCommunityIcons name="arrow-left" size={24} color="#444964" />
          </Pressable>
          <Text className="flex-1 text-2xl font-balooBold text-secondary">
            {t("feedback.title")}
          </Text>
          <Pressable
            onPress={handlePressSubmit}
            disabled={!canSubmit}
            className={`px-4 py-1.5 rounded-full ${canSubmit ? "bg-lime-300" : "bg-gray-300"}`}
          >
            <Text className="font-balooBold text-base text-black">
              {isSubmitting ? t("feedback.submitting") : t("feedback.submit")}
            </Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled">
          <View className="bg-white rounded-2xl px-4 py-3 mt-4">
            <FormTextInput
              name="text"
              placeholder={t("feedback.placeholder")}
              control={control}
              inputRef={textInputRef}
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

          {text.length === 0 && (
            <View className="mt-6 px-1">
              <Text className="text-sm font-balooBold text-secondary/60">
                {t("feedback.trySaying")}
              </Text>
              <Text className="text-sm font-baloo text-secondary/60 mt-1">
                {t("feedback.trySayingBug")}
              </Text>
              <Text className="text-sm font-baloo text-secondary/60">
                {t("feedback.trySayingIdea")}
              </Text>
            </View>
          )}

          <Text className="text-xs font-baloo text-secondary/50 text-center mt-6">
            {t("feedback.accountNote")}
          </Text>
        </ScrollView>

        {isTranscribing && (
          <Text className="text-sm font-baloo text-secondary/60 text-center">
            {t("feedback.transcribing")}
          </Text>
        )}

        {isMicRefused && (
          <MicPermissionHint
            variant="onLight"
            showDisabledReason={isMicDisabledReasonVisible}
            showSettingsButton={needsSettings}
            onOpenSettings={openSettings}
          />
        )}

        {/* The tab bar stays visible under Settings pages and already covers the home indicator. */}
        <View className="flex-row items-center gap-3 px-5 py-3">
          <Pressable
            onPress={handleToggleKeyboard}
            accessibilityLabel={
              isKeyboardVisible ? t("feedback.hideKeyboard") : t("feedback.useKeyboard")
            }
            className="w-14 h-14 rounded-full bg-white items-center justify-center"
          >
            {isKeyboardVisible ? (
              <MaterialCommunityIcons name="keyboard-close" size={24} color="#444964" />
            ) : (
              <Text className="font-balooBold text-lg text-secondary">Aa</Text>
            )}
          </Pressable>
          <View className="flex-1">
            <HoldToTalkPill
              variant="onLight"
              isRecording={isRecording}
              disabled={isTranscribing || isSubmitting}
              minHoldMs={MIN_HOLD_MS}
              onPressIn={() => void handleMicPressIn()}
              onPressOut={handleMicRelease}
              onHeldLongEnough={markHeldLongEnough}
            />
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
