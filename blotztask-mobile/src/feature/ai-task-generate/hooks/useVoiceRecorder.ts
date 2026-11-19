import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";
import {
  useVoiceRecorder as useSharedVoiceRecorder,
  VoiceRecordingFailure,
} from "@/shared/hooks/useVoiceRecorder";

export type { VoiceRecordingFailure };

// onFailure lets each caller report failures its own way (the AI sheet sends them to PostHog).
export function useVoiceRecorder(
  submitAudioForTranscription: (uri: string, releasedAt: number) => Promise<void>,
  onFailure?: (failure: VoiceRecordingFailure) => void,
) {
  const { t } = useTranslation("aiTaskGenerate");
  return useSharedVoiceRecorder(submitAudioForTranscription, {
    onError: (error) => Toast.show({ type: "error", text1: t(`errors.${error}`) }),
    onFailure,
  });
}
