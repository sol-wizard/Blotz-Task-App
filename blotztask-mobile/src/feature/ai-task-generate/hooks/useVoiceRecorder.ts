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

const CONNECTION_NOT_READY_ERROR_CODE = "ConnectionNotReady";

export function useVoiceRecorder(submitAudioForTranscription: (uri: string) => Promise<void>) {
  const { t } = useTranslation("aiTaskGenerate");
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const { isRecording } = useAudioRecorderState(recorder);
  // Release handlers wait on this so they never race ahead of async recorder setup.
  const startPromiseRef = useRef<Promise<void> | null>(null);

  const trackRecordingFailure = (errorCode: string) => {
    analytics.trackAiTaskGenerationFailed({
      inputMode: "voice",
      stage: "recording",
      errorCode,
    });
  };

  const startListening = () => {
    const startPromise = startRecording();
    startPromiseRef.current = startPromise;
    void startPromise.finally(() => {
      if (startPromiseRef.current === startPromise) {
        startPromiseRef.current = null;
      }
    });
  };

  const startRecording = async (): Promise<void> => {
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      Toast.show({ type: "error", text1: t("errors.recordingFailed") });
      console.warn("[Mic] Error starting recording.", error);
      trackRecordingFailure("RecordingStartFailed");
    }
  };

  const waitForStartAfterRelease = async (): Promise<void> => {
    await startPromiseRef.current;
  };

  const cancelListening = async (): Promise<void> => {
    await waitForStartAfterRelease();

    if (recorder.isRecording) {
      try {
        await recorder.stop();
      } catch (error) {
        console.warn("[Mic] Error cancelling recording.", error);
        trackRecordingFailure("RecordingCancelFailed");
      }
    }
  };

  const stopAndUpload = async (): Promise<boolean> => {
    await waitForStartAfterRelease();

    if (!recorder.isRecording) {
      Toast.show({ type: "error", text1: t("errors.emptyAudio") });
      console.warn("[Mic] stopAndUpload called but recorder is not recording.");
      trackRecordingFailure("NotRecording");
      return false;
    }

    try {
      await recorder.stop();
    } catch (error) {
      console.warn("[Mic] Error stopping recording.", error);
      trackRecordingFailure("RecordingStopFailed");
      return false;
    }

    const uri = recorder.uri;
    if (!uri) {
      Toast.show({ type: "error", text1: t("errors.emptyAudio") });
      trackRecordingFailure("EmptyAudio");
      return false;
    }

    try {
      await submitAudioForTranscription(uri);
    } catch (error) {
      console.warn("[Mic] Error submitting audio for transcription.", error);
      Toast.show({ type: "error", text1: t("errors.default") });
      analytics.trackAiTaskGenerationFailed({
        inputMode: "voice",
        stage: "send",
        errorCode:
          error instanceof Error && error.message === CONNECTION_NOT_READY_ERROR_CODE
            ? CONNECTION_NOT_READY_ERROR_CODE
            : "AudioSubmitFailed",
      });
      return false;
    }

    // Best-effort cleanup of the temp recording; failure here shouldn't surface as an AI failure.
    try {
      new ExpoFile(uri).delete();
    } catch (error) {
      console.warn("[Mic] Failed to delete temp recording file.", error);
    }

    return true;
  };

  return {
    isRecording,
    startListening,
    stopAndUpload,
    cancelListening,
  };
}
