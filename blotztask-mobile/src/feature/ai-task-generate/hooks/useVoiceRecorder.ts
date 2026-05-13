import {
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { File as ExpoFile } from "expo-file-system";

export function useVoiceRecorder(submitAudioForTranscription: (uri: string) => Promise<void>) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);

  const startListening = async () => {
    console.log("🥾 [Mic] Starting recording...");
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      console.log("🎙️ [Mic] Recording started.");
    } catch (error) {
      console.warn("[Mic] Error starting recording.", error);
    }
  };

  const cancelListening = async (): Promise<void> => {
    console.log("🚫 [Mic] Cancelling recording...");
    if (recorder.isRecording) {
      await recorder.stop();
    }
  };

  const stopAndUpload = async (): Promise<void> => {
    console.log("💾 [Mic] Stopping and uploading recording...");
    if (!recorder.isRecording) {
      console.warn("[Mic] stopAndUpload called but recorder is not recording.");
      return;
    }

    try {
      await recorder.stop();

      const uri = recorder.uri;
      if (!uri) return;

      await submitAudioForTranscription(uri);
      new ExpoFile(uri).delete();
      console.log("✅ [Mic] Recording uploaded and local file deleted.");
    } catch (error) {
      console.warn("[Mic] Error stopping recording.", error);
    } finally {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(
        () => undefined,
      );
    }
  };

  return { isListening: state.isRecording, startListening, stopAndUpload, cancelListening };
}
