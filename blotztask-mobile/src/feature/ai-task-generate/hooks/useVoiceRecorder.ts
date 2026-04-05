import { RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { useState } from "react";
import { File as ExpoFile } from "expo-file-system";

const RECORD_OPTIONS = { ...RecordingPresets.HIGH_QUALITY };

export function useVoiceRecorder(transcribeAudio: (uri: string) => Promise<void>) {
  const [isListening, setIsListening] = useState(false);
  const recorder = useAudioRecorder(RECORD_OPTIONS);

  const startListening = async () => {
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsListening(true);
    } catch (error) {
      console.warn("[Mic] Error starting recording.", error);
    }
  };

  const stopAndUpload = async () => {
    if (!recorder.isRecording) return;
    try {
      await recorder.stop();
      setIsListening(false);
      const uri = recorder.uri;
      if (uri) {
        await transcribeAudio(uri);
        new ExpoFile(uri).delete();
      }
      console.log("[Mic] Recording stopped and uploaded:", uri);
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
