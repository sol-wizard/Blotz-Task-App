import type { AudioRecorder } from "expo-audio";
import { useEffect, useRef } from "react";

const POLL_MS = 100;

/** Loudest metering value (dBFS) during a take. Polls into a ref so the ticks don't re-render. */
export function usePeakLevelMeter(recorder: AudioRecorder) {
  const peakRef = useRef(Number.NEGATIVE_INFINITY);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = () => {
    stop();
    peakRef.current = Number.NEGATIVE_INFINITY;
    intervalRef.current = setInterval(() => {
      const status = recorder.getStatus();
      // iOS meters 0 dB while idle; only trust a live take.
      if (!status.isRecording || status.metering === undefined) return;
      peakRef.current = Math.max(peakRef.current, status.metering);
    }, POLL_MS);
  };

  useEffect(() => stop, []);

  return { start, stop, peakDbfs: () => peakRef.current };
}
