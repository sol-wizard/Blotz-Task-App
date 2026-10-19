import {
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useCallback, useEffect, useRef } from "react";
import { File as ExpoFile } from "expo-file-system";
import { usePeakLevelMeter } from "./usePeakLevelMeter";

// Takes that never get louder than this are dropped before upload: Whisper invents text
// ("Thank you.") for silence. iPhone readings: quiet room -51, quiet speech -42, close speech -15.
const SPEECH_LEVEL_DBFS = -45;

export type VoiceRecordingFailure = { stage: "recording" | "send"; errorCode: string };

type VoiceRecorderOptions = {
  onError: (error: "recordingFailed" | "emptyAudio") => void;
  onFailure: (failure: VoiceRecordingFailure) => void;
};

export function useVoiceRecorder(
  submitAudioForTranscription: (uri: string) => Promise<void>,
  { onError, onFailure }: VoiceRecorderOptions,
) {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const { isRecording } = useAudioRecorderState(recorder);
  const meter = usePeakLevelMeter(recorder);

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

  // Set the audio mode here, but open the mic only on press-in (150-260ms): iOS mutes haptics
  // while the mic is open, so pre-warming on mount silenced the first press. Mode is global;
  // hand it back on unmount.
  useEffect(() => {
    setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }).catch((error) =>
      console.warn("[Mic] Failed to set recording audio mode.", error),
    );
    return () => {
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch((error) =>
        console.warn("[Mic] Failed to reset audio mode.", error),
      );
    };
  }, []);

  const trackRecordingFailure = (errorCode: string) => {
    onFailure({ stage: "recording", errorCode });
  };

  const startListening = () => {
    if (startPromiseRef.current || recorder.isRecording) return;
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
      meter.start();
    } catch (error) {
      onError("recordingFailed");
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
      meter.stop();
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
      onError("emptyAudio");
      console.warn("[Mic] stopAndUpload called but recorder is not recording.");
      trackRecordingFailure("NotRecording");
      return false;
    }

    try {
      await recorder.stop();
    } catch (error) {
      console.warn("[Mic] Error stopping recording.", error);
      onError("recordingFailed");
      trackRecordingFailure("RecordingStopFailed");
      return false;
    } finally {
      meter.stop();
      isPreparedRef.current = false;
    }

    const uri = recorder.uri;
    if (!uri) {
      onError("emptyAudio");
      trackRecordingFailure("EmptyAudio");
      return false;
    }

    const peakDbfs = meter.peakDbfs();
    if (peakDbfs < SPEECH_LEVEL_DBFS) {
      onError("emptyAudio");
      console.warn(`[Mic] No speech detected (peak ${peakDbfs.toFixed(1)} dBFS); take discarded.`);
      trackRecordingFailure("NoSpeechDetected");
      discardRecordingFile(uri);
      return false;
    }

    try {
      await submitAudioForTranscription(uri);
    } catch (error) {
      console.warn("[Mic] Error submitting audio for transcription.", error);
      onFailure({ stage: "send", errorCode: "AudioSubmitFailed" });
      return false;
    } finally {
      discardRecordingFile(uri);
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
