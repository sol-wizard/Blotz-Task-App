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
  const setupPromiseRef = useRef<Promise<void> | null>(null);
  const sessionIdRef = useRef(0);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startListening = async () => {
    // Set listening immediately so the waveform appears on press rather than
    // after the async audio setup completes (~200-400ms later).
    setIsListening(true);
    const sessionId = ++sessionIdRef.current;
    setupPromiseRef.current = (async () => {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      recordingStartedAtRef.current = Date.now();
    })().catch((error) => {
      if (sessionId === sessionIdRef.current) {
        setIsListening(false);
        recordingStartedAtRef.current = null;
      }
      console.warn("[Mic] Error starting recording.", error);
    });
  };

  const cancelListening = async (): Promise<void> => {
    if (recorder.isRecording) {
      await recorder.stop();
    }
    setIsListening(false);
  };

  const stopAndUpload = async (): Promise<StopAndUploadResult | void> => {
    const sessionId = sessionIdRef.current;

    // Wait for recording setup to finish if the user released before it completed
    if (setupPromiseRef.current) {
      await setupPromiseRef.current;
      setupPromiseRef.current = null;
    }

    // Use our own ref rather than recorder.isRecording — recorder.isRecording is
    // React state and may be stale immediately after recorder.record() is called.
    if (!recordingStartedAtRef.current) {
      setIsListening(false);
      return;
    }

    const pressReleasedAt = Date.now();
    const duration = recordingStartedAtRef.current
      ? pressReleasedAt - recordingStartedAtRef.current
      : Infinity;
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
      // Only reset audio mode if a newer session hasn't already started.
      // Without this guard, the finally of session N resets allowsRecording: false
      // AFTER session N+1 has already set it to true, breaking the next recording.
      if (sessionId === sessionIdRef.current) {
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(
          () => undefined,
        );
      }
    }
  };

  return { isListening, startListening, stopAndUpload, cancelListening };
}
