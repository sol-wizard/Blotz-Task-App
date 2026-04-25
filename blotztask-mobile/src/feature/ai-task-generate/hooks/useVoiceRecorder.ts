import { RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { useRef, useState } from "react";
import { File as ExpoFile } from "expo-file-system";

export enum StopAndUploadResult {
  Short = "Short",
  Uploaded = "Uploaded",
}

const MIN_RECORDING_MS = 1000;

export function useVoiceRecorder(submitAudioForTranscription: (uri: string) => Promise<void>) {
  const [isListening, setIsListening] = useState(false);
  const recordingStartedAtRef = useRef<number | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startListening = async () => {
    // Set listening immediately so the waveform appears on press rather than
    // after the async audio setup completes (~200-400ms later).
    setIsListening(true);
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      recordingStartedAtRef.current = Date.now();
    } catch (error) {
      setIsListening(false);
      recordingStartedAtRef.current = null;
      console.warn("[Mic] Error starting recording.", error);
    }
  };

  const stopAndUpload = async (): Promise<StopAndUploadResult | void> => {
    if (!recorder.isRecording) {
      setIsListening(false);
      return;
    }

    const pressReleasedAt = Date.now();
    const duration = recordingStartedAtRef.current ? pressReleasedAt - recordingStartedAtRef.current : Infinity;
    recordingStartedAtRef.current = null;

    try {
      await recorder.stop();
      setIsListening(false);

      if (duration < MIN_RECORDING_MS) {
        return StopAndUploadResult.Short;
      }

      const uri = recorder.uri;
      if (!uri) return;

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

  return { isListening, startListening, stopAndUpload, setIsListening };
}
