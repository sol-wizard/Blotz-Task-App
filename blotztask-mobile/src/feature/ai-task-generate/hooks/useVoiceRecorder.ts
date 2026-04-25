import { RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { useState } from "react";
import { File as ExpoFile } from "expo-file-system";

export function useVoiceRecorder(submitAudioForTranscription: (uri: string) => Promise<void>) {
  const [isListening, setIsListening] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startListening = async () => {
    // Set listening immediately so the waveform appears on press rather than
    // after the async audio setup completes (~200-400ms later).
    setIsListening(true);
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      setIsListening(false);
      console.warn("[Mic] Error starting recording.", error);
    }
  };

  const cancelListening = async (): Promise<void> => {
    if (recorder.isRecording) {
      await recorder.stop();
    }
    setIsListening(false);
  };

  const stopAndUpload = async (): Promise<void> => {
    if (!recorder.isRecording) {
      setIsListening(false);
      return;
    }

    try {
      await recorder.stop();
      setIsListening(false);

      const uri = recorder.uri;
      if (!uri) return;
      await submitAudioForTranscription(uri);
      new ExpoFile(uri).delete();
    } catch (error) {
      console.warn("[Mic] Error stopping recording.", error);
    } finally {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(
        () => undefined,
      );
    }
  };

  return { isListening, startListening, stopAndUpload, cancelListening, setIsListening };
}
