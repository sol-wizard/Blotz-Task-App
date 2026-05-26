import {
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useRef } from "react";
import { File as ExpoFile } from "expo-file-system";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";
import { analytics } from "@/shared/services/analytics";

export function useVoiceRecorder(submitAudioForTranscription: (uri: string) => Promise<void>) {
  const { t } = useTranslation("aiTaskGenerate");
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const { isRecording } = useAudioRecorderState(recorder);
  // Prevents race condition between startListening and cancelListening.
  const cancelRequested = useRef(false);

  const startListening = async () => {
    cancelRequested.current = false;
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (cancelRequested.current) return;
      recorder.record();
    } catch (error) {
      Toast.show({ type: "warning", text1: t("errors.recordingFailed") });
      console.warn("[Mic] Error starting recording.", error);
      analytics.trackAiTaskGenerationFailed({
        inputMode: "voice",
        stage: "recording",
        errorCode: "RecordingStartFailed",
      });
    }
  };

  const cancelListening = async (): Promise<void> => {
    cancelRequested.current = true;
    if (recorder.isRecording) {
      await recorder.stop();
    }
  };

  const stopAndUpload = async (): Promise<void> => {
    if (!recorder.isRecording) {
      Toast.show({ type: "warning", text1: t("errors.emptyAudio") });
      console.warn("[Mic] stopAndUpload called but recorder is not recording.");
      analytics.trackAiTaskGenerationFailed({
        inputMode: "voice",
        stage: "recording",
        errorCode: "NotRecording",
      });
      return;
    }

    try {
      await recorder.stop();
    } catch (error) {
      console.warn("[Mic] Error stopping recording.", error);
      analytics.trackAiTaskGenerationFailed({
        inputMode: "voice",
        stage: "recording",
        errorCode: "RecordingStopFailed",
      });
      return;
    }

    const uri = recorder.uri;
    if (!uri) {
      Toast.show({ type: "warning", text1: t("errors.emptyAudio") });
      analytics.trackAiTaskGenerationFailed({
        inputMode: "voice",
        stage: "recording",
        errorCode: "EmptyAudio",
      });
      return;
    }

    try {
      await submitAudioForTranscription(uri);
    } catch (error) {
      console.warn("[Mic] Error submitting audio for transcription.", error);
      analytics.trackAiTaskGenerationFailed({
        inputMode: "voice",
        stage: "send",
        errorCode: "AudioSubmitFailed",
      });
      return;
    }

    // Best-effort cleanup of the temp recording; failure here shouldn't surface as an AI failure.
    try {
      new ExpoFile(uri).delete();
    } catch (error) {
      console.warn("[Mic] Failed to delete temp recording file.", error);
    }
  };

  return { isRecording, startListening, stopAndUpload, cancelListening };
}
