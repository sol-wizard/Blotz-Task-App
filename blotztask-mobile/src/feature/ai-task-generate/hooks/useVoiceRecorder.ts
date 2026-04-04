import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { File as ExpoFile } from "expo-file-system";

const RECORD_OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };

export function useVoiceRecorder(transcribeAudio: (uri: string) => Promise<void>) {
  const [isListening, setIsListening] = useState(false);
  const recorder = useAudioRecorder(RECORD_OPTIONS);
  const hasFoundVoice = useRef(false);

  const { metering } = recorder.getStatus();

  const requestPermission = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        console.warn("[Mic] Permission not granted");
        return;
      }
    } catch (error) {
      console.warn("[Mic] Error requesting permission.", error);
      return;
    }
  };

  const startListening = async () => {
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsListening(true);
    } catch (error) {
      console.warn("[Mic] Error creating recording.", error);
    }
  };

  const listeningBreak = async () => {
    if (!isListening) {
      console.warn("[Mic] No active recording");
      return;
    }

    await recorder.stop();
    return recorder.uri;
  };

  const uploadAudio = async (uri: string) => {
    try {
      await transcribeAudio(uri);
      new ExpoFile(uri).delete();
    } catch (error) {
      console.warn("[Mic] Error stopping recording.", error);
    }
  };

  const abortListening = async () => {
    setIsListening(false);
    try {
      if (recorder.isRecording) {
        await recorder.stop();
      }
    } finally {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(
        () => undefined,
      );
    }
  };

  useEffect(() => {
    void (async () => {
      void requestPermission();
      startListening();
      if (metering && metering > -30) {
        hasFoundVoice.current = true;
      }
      if (metering && metering < -30 && hasFoundVoice.current) {
        const uri = await listeningBreak();
        if (uri) {
          await uploadAudio(uri);
        }
        startListening();
      }
    })();
  }, [metering]);

  return { isListening, uploadAudio, listeningBreak, startListening, abortListening };
}
