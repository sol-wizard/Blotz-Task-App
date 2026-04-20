import { RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { useRef, useState } from "react";
import { File as ExpoFile } from "expo-file-system";

// Minimum hold duration before we treat the recording as intentional.
// Since the mic now starts on onPressIn (not onLongPress), a quick accidental
// tap would otherwise immediately upload silence or near-silence to the backend.
const MIN_RECORDING_DURATION_MS = 1000;

export enum StopAndUploadResult {
  Uploaded,
  Short,
  NoAudio,
}

export function useVoiceRecorder(
  submitAudioForTranscription: (uri: string, pressReleasedAt: number) => Promise<void>,
) {
  const [isListening, setIsListening] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recordingStartedAt = useRef<number | null>(null);

  const startListening = async () => {
    // Set listening immediately so the waveform appears on press rather than
    // after the async audio setup completes (~200-400ms later).
    setIsListening(true);
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      recordingStartedAt.current = Date.now();
    } catch (error) {
      setIsListening(false);
      console.warn("[Mic] Error starting recording.", error);
    }
  };

  const stopAndUpload = async (): Promise<StopAndUploadResult | undefined> => {
    const pressReleasedAt = Date.now();
    const elapsed = recordingStartedAt.current ? pressReleasedAt - recordingStartedAt.current : 0;
    recordingStartedAt.current = null;
    const isTooShort = elapsed < MIN_RECORDING_DURATION_MS;

    if (!recorder.isRecording) {
      setIsListening(false);
      return isTooShort ? StopAndUploadResult.Short : undefined;
    }

    try {
      const stopStart = Date.now();
      await recorder.stop();
      const stopEnd = Date.now();
      setIsListening(false);
      if (isTooShort) return StopAndUploadResult.Short;
      const uri = recorder.uri;
      if (!uri) return StopAndUploadResult.NoAudio;
      console.log(
        `[VoiceTiming] stopAndUpload: recordedMs=${elapsed} recorderStopMs=${stopEnd - stopStart}`,
      );
      await submitAudioForTranscription(uri, pressReleasedAt);
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
