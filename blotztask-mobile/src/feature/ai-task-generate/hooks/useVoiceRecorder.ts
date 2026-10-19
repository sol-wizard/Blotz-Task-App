import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";
import { analytics } from "@/shared/services/analytics";
import { useVoiceRecorder as useSharedVoiceRecorder } from "@/shared/hooks/useVoiceRecorder";

export function useVoiceRecorder(submitAudioForTranscription: (uri: string) => Promise<void>) {
  const { t } = useTranslation("aiTaskGenerate");
  return useSharedVoiceRecorder(submitAudioForTranscription, {
    onError: (error) => Toast.show({ type: "error", text1: t(`errors.${error}`) }),
    onFailure: (failure) =>
      analytics.trackAiTaskGenerationFailed({ inputMode: "voice", ...failure }),
  });
}
