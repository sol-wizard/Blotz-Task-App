import {
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useCallback, useEffect, useRef } from "react";
import { File as ExpoFile } from "expo-file-system";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";
import { analytics } from "@/shared/services/analytics";

// Whisper invents text ("Thank you.") when the audio holds no speech, so a take whose loudest
// moment never rises above this level is discarded before upload. Metering is dBFS on both
// platforms (iOS averagePower, Android converted from maxAmplitude). Measured on an iPhone
// 2026-09-10: a quiet room reads about -51, speech played from a laptop across the desk -42 to -35,
// speech at max volume -15. -45 sits between silence and quiet speech; tune from the dev log below.
const SPEECH_LEVEL_DBFS = -45;
const METER_POLL_MS = 100;

export function useVoiceRecorder(submitAudioForTranscription: (uri: string) => Promise<void>) {
  const { t } = useTranslation("aiTaskGenerate");
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const { isRecording } = useAudioRecorderState(recorder);

  // Loudest level seen during the current take. Polled into a ref rather than through
  // useAudioRecorderState so the 100ms ticks don't re-render the whole sheet.
  const peakLevelRef = useRef(Number.NEGATIVE_INFINITY);
  const meterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Release handlers wait on this so they never race ahead of async recorder setup.
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const cancelRequested = useRef(false);

  // Android throws AudioRecorderAlreadyPreparedException on a second prepare
  // (iOS silently re-prepares), so track prepared state and only prepare when
  // needed. stop() releases the native recorder on Android, so the flag resets
  // after every stop attempt.
  const isPreparedRef = useRef(false);

  const prepareRecorder = useCallback(async (): Promise<void> => {
    if (isPreparedRef.current) return;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    isPreparedRef.current = true;
  }, [recorder]);

  const startMetering = () => {
    stopMetering();
    peakLevelRef.current = Number.NEGATIVE_INFINITY;
    meterIntervalRef.current = setInterval(() => {
      const status = recorder.getStatus();
      // iOS reports 0 dB (full scale) for averagePower while idle, so only trust a live take.
      if (!status.isRecording || status.metering === undefined) return;
      peakLevelRef.current = Math.max(peakLevelRef.current, status.metering);
    }, METER_POLL_MS);
  };

  const stopMetering = () => {
    if (meterIntervalRef.current !== null) {
      clearInterval(meterIntervalRef.current);
      meterIntervalRef.current = null;
    }
  };

  // Set the recording audio mode up front, but do NOT open the mic input until press-in:
  // iOS silences haptics while an audio input is open, so a recorder pre-warmed on mount
  // swallowed the press haptic on the first hold. Opening on press costs 150-260ms on an
  // iPhone 17 Pro (measured 2026-09-10), and the haptic is dispatched before it starts.
  // Any haptic fired while recording must wait for the recorder to stop, for the same reason.
  // The recording audio mode is process-global, so hand it back on unmount.
  useEffect(() => {
    setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }).catch((error) =>
      console.warn("[Mic] Failed to set recording audio mode.", error),
    );
    return () => {
      stopMetering();
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch((error) =>
        console.warn("[Mic] Failed to reset audio mode.", error),
      );
    };
  }, []);

  const trackRecordingFailure = (errorCode: string) => {
    analytics.trackAiTaskGenerationFailed({
      inputMode: "voice",
      stage: "recording",
      errorCode,
    });
  };

  const startListening = () => {
    cancelRequested.current = false;
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
      await prepareRecorder();
      if (cancelRequested.current) return;
      recorder.record();
      startMetering();
    } catch (error) {
      Toast.show({ type: "error", text1: t("errors.recordingFailed") });
      console.warn("[Mic] Error starting recording.", error);
      trackRecordingFailure("RecordingStartFailed");
    }
  };

  const cancelListening = async (): Promise<void> => {
    cancelRequested.current = true;
    await startPromiseRef.current;

    if (!recorder.isRecording) return;

    try {
      await recorder.stop();
    } catch (error) {
      console.warn("[Mic] Error cancelling recording.", error);
      trackRecordingFailure("RecordingCancelFailed");
      return;
    } finally {
      stopMetering();
      isPreparedRef.current = false;
    }

    if (recorder.uri) discardRecordingFile(recorder.uri);
  };

  // Best-effort cleanup of a temp recording; failure here shouldn't surface as an AI failure.
  const discardRecordingFile = (uri: string) => {
    try {
      new ExpoFile(uri).delete();
    } catch (error) {
      console.warn("[Mic] Failed to delete temp recording file.", error);
    }
  };

  const stopAndUpload = async (): Promise<boolean> => {
    await startPromiseRef.current;

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
    } finally {
      stopMetering();
      isPreparedRef.current = false;
    }

    const uri = recorder.uri;
    if (!uri) {
      trackRecordingFailure("EmptyAudio");
      return false;
    }

    // Nothing loud enough to be speech: don't let Whisper make something up.
    if (peakLevelRef.current < SPEECH_LEVEL_DBFS) {
      Toast.show({ type: "error", text1: t("errors.emptyAudio") });
      console.warn(`[Mic] No speech detected (peak ${peakLevelRef.current} dBFS); take discarded.`);
      trackRecordingFailure("NoSpeechDetected");
      discardRecordingFile(uri);
      return false;
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
      return false;
    }

    discardRecordingFile(uri);
    return true;
  };

  return {
    isRecording,
    startListening,
    stopAndUpload,
    cancelListening,
  };
}
