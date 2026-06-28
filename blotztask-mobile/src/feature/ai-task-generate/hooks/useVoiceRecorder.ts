import { RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { useRef, useState } from "react";
import { File as ExpoFile } from "expo-file-system";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";
import { analytics } from "@/shared/services/analytics";

export type VoiceInputState = "idle" | "preparing" | "recording" | "stopping" | "sending" | "error";

const CONNECTION_NOT_READY_ERROR_CODE = "ConnectionNotReady";

type UseVoiceInputOptions = {
  submitAudio: (uri: string) => Promise<void>;
};

export function useVoiceInput({ submitAudio }: UseVoiceInputOptions) {
  const { t } = useTranslation("aiTaskGenerate");
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [state, setState] = useState<VoiceInputState>("idle");
  const [isHoldHintVisible, setIsHoldHintVisible] = useState(false);
  const stateRef = useRef<VoiceInputState>("idle");
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const pressActiveRef = useRef(false);
  const recordingStartedRef = useRef(false);

  const setVoiceState = (nextState: VoiceInputState) => {
    stateRef.current = nextState;
    setState(nextState);
  };

  const trackRecordingFailure = (errorCode: string) => {
    analytics.trackAiTaskGenerationFailed({
      inputMode: "voice",
      stage: "recording",
      errorCode,
    });
  };

  const releasePreparedRecording = async (): Promise<void> => {
    try {
      await recorder.stop();
    } catch (error) {
      console.warn("[Mic] Error releasing prepared recording.", error);
      trackRecordingFailure("RecordingCancelFailed");
    }
  };

  const handlePressIn = () => {
    setIsHoldHintVisible(false);
    if (stateRef.current !== "idle" && stateRef.current !== "error") return;

    pressActiveRef.current = true;
    recordingStartedRef.current = false;
    setVoiceState("preparing");

    const startPromise = startRecording();
    startPromiseRef.current = startPromise;
  };

  const startRecording = async (): Promise<void> => {
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (!pressActiveRef.current) {
        await releasePreparedRecording();
        setVoiceState("idle");
        return;
      }
      recorder.record();
      recordingStartedRef.current = true;
      setVoiceState("recording");
    } catch (error) {
      setVoiceState("error");
      Toast.show({ type: "error", text1: t("errors.recordingFailed") });
      console.warn("[Mic] Error starting recording.", error);
      trackRecordingFailure("RecordingStartFailed");
    } finally {
      startPromiseRef.current = null;
    }
  };

  const cancel = async (): Promise<void> => {
    pressActiveRef.current = false;
    await startPromiseRef.current;

    if (recordingStartedRef.current) {
      try {
        await recorder.stop();
      } catch (error) {
        console.warn("[Mic] Error cancelling recording.", error);
        trackRecordingFailure("RecordingCancelFailed");
      }
    }

    recordingStartedRef.current = false;
    startPromiseRef.current = null;
    setVoiceState("idle");
  };

  const handlePressOut = async (): Promise<boolean> => {
    if (stateRef.current === "error" && !pressActiveRef.current && !recordingStartedRef.current) {
      return false;
    }

    pressActiveRef.current = false;
    await startPromiseRef.current;

    if (stateRef.current === "error") {
      return false;
    }

    if (!recordingStartedRef.current) {
      startPromiseRef.current = null;
      setIsHoldHintVisible(true);
      setVoiceState("idle");
      return false;
    }

    setVoiceState("stopping");
    try {
      await recorder.stop();
    } catch (error) {
      setVoiceState("error");
      console.warn("[Mic] Error stopping recording.", error);
      trackRecordingFailure("RecordingStopFailed");
      return false;
    }

    recordingStartedRef.current = false;
    startPromiseRef.current = null;

    const uri = recorder.uri;
    if (!uri) {
      setVoiceState("error");
      Toast.show({ type: "error", text1: t("errors.emptyAudio") });
      trackRecordingFailure("EmptyAudio");
      return false;
    }

    setVoiceState("sending");
    try {
      await submitAudio(uri);
      setVoiceState("idle");
    } catch (error) {
      setVoiceState("error");
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
    state,
    isRecording: state === "recording",
    isBusy:
      state === "preparing" || state === "recording" || state === "stopping" || state === "sending",
    isHoldHintVisible,
    handlePressIn,
    handlePressOut,
    cancel,
  };
}
