import { useState } from "react";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { File as ExpoFile } from "expo-file-system";

export function useVoiceRecorder(transcribeAudio: (uri: string) => Promise<void>) {
  const [isListening, setIsListening] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startListening = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        console.warn("[Mic] Permission not granted");
        return;
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsListening(true);
    } catch (error) {
      console.warn("[Mic] Error creating recording.", error);
    }
  };

  const uploadAudio = async () => {
    try {
      if (!isListening) {
        console.warn("[Mic] No active recording");
        return;
      }

      setIsUploadingAudio(true);
      await recorder.stop();
      const uri = recorder.uri;
      setIsListening(false);

      if (!uri) {
        console.warn("[Mic] No recording URI found");
        return;
      }

      await transcribeAudio(uri);
      new ExpoFile(uri).delete();
    } catch (error) {
      console.warn("[Mic] Error stopping recording.", error);
    } finally {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
      setIsUploadingAudio(false);
    }
  };

  const abortListening = async () => {
    setIsListening(false);
    try {
      if (recorder.isRecording) {
        await recorder.stop();
      }
    } finally {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    }
  };

  return { isListening, isUploadingAudio, startListening, uploadAudio, abortListening };
}
