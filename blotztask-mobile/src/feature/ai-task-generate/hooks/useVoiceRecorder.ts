import { RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { useRef, useState } from "react";
import { File as ExpoFile } from "expo-file-system";

// Minimum hold duration before we treat the recording as intentional.
// Since the mic now starts on onPressIn (not onLongPress), a quick accidental
// tap would otherwise immediately upload silence or near-silence to the backend.
const MIN_RECORDING_DURATION_MS = 1000;

const RECORD_OPTIONS = { ...RecordingPresets.HIGH_QUALITY };

export enum StopAndUploadResult {
  Uploaded,
  Short,
  NoAudio,
}

export function useVoiceRecorder(submitAudioForTranscription: (uri: string) => Promise<void>) {
  const [isListening, setIsListening] = useState(false);
  const recorder = useAudioRecorder(RECORD_OPTIONS);
  const recordingStartedAt = useRef<number | null>(null);

  const startListening = async () => {
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      recordingStartedAt.current = Date.now();
      setIsListening(true);
    } catch (error) {
      console.warn("[Mic] Error starting recording.", error);
    }
  };

  const stopAndUpload = async (): Promise<StopAndUploadResult | undefined> => {
    const elapsed = recordingStartedAt.current ? Date.now() - recordingStartedAt.current : 0;
    recordingStartedAt.current = null;
    const isTooShort = elapsed < MIN_RECORDING_DURATION_MS;

    if (!recorder.isRecording) {
      // Recording never fully started — just signal the result without touching the recorder.
      return isTooShort ? StopAndUploadResult.Short : undefined;
    }

    try {
      await recorder.stop();
      setIsListening(false);
      if (isTooShort) return StopAndUploadResult.Short;
      const uri = recorder.uri;
      if (!uri) return StopAndUploadResult.NoAudio;
      await submitAudioForTranscription(uri);
      new ExpoFile(uri).delete();
      return StopAndUploadResult.Uploaded;
    } catch (error) {
      console.warn("[Mic] Error stopping recording.", error);
    } finally {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(
        () => undefined,
      );
    }
  };

  return { isListening, startListening, stopAndUpload };
}
