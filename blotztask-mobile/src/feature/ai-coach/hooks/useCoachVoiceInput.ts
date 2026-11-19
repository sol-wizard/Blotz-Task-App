import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Keyboard } from "react-native";
import { useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { analytics } from "@/shared/services/analytics";
import { useMicPermission } from "@/shared/hooks/useMicPermission";
import { useVoiceRecorder } from "@/shared/hooks/useVoiceRecorder";
import { transcribeAudio } from "../services/ai-coach-service";

// A take stops and sends itself here, keeping uploads small and transcription quick.
export const MAX_RECORDING_MS = 60_000;

export type CoachVoicePhase = "idle" | "recording" | "sending";

export function useCoachVoiceInput(
  conversationId: string | undefined,
  onTranscript: (text: string) => void,
) {
  const { t } = useTranslation("aiCoach");
  const [phase, setPhase] = useState<CoachVoicePhase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const phaseRef = useRef<CoachVoicePhase>("idle");
  const permissionPending = useRef(false);
  const active = useRef(false);
  const generation = useRef(0);
  const recordingGeneration = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // The transcript lands seconds after the tap; send through the panel's latest state.
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);
  // A conversation change invalidates an outstanding transcript.
  useEffect(() => {
    generation.current += 1;
  }, [conversationId]);

  const setVoicePhase = (next: CoachVoicePhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const clearTimer = () => {
    if (timer.current !== null) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const { isMicUsable, requestMic, openSettings } = useMicPermission((outcome, errorCode) => {
    analytics.trackAiCoachMicPermissionResolved(outcome, errorCode);
    if (outcome === "denied" || outcome === "blocked" || outcome === "error") {
      analytics.trackAiCoachVoiceFailed({
        stage: "permission",
        errorCode: errorCode ?? "PermissionDenied",
      });
    }
  });
  const { startListening, stopAndUpload, cancelListening } = useVoiceRecorder(
    async (uri) => {
      const expectedGeneration = recordingGeneration.current;
      if (!active.current || generation.current !== expectedGeneration) return;
      try {
        const text = await transcribeAudio(uri);
        if (active.current && generation.current === expectedGeneration) onTranscriptRef.current(text);
      } catch (error) {
        if (active.current) Toast.show({ type: "error", text1: t("chat.transcribeFailed") });
        throw error;
      }
    },
    {
      onError: (error) => {
        // The mic never opened, so leave the recording bar instead of waiting for a tap.
        if (error === "recordingFailed" && phaseRef.current === "recording") {
          clearTimer();
          setVoicePhase("idle");
        }
        if (active.current) Toast.show({ type: "error", text1: t(`chat.${error}`) });
      },
      onFailure: (failure) => analytics.trackAiCoachVoiceFailed(failure),
    },
  );
  const cancelRef = useRef(cancelListening);
  useEffect(() => {
    cancelRef.current = cancelListening;
  }, [cancelListening]);
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      const cancel = () => {
        generation.current += 1;
        clearTimer();
        if (phaseRef.current !== "recording") return;
        phaseRef.current = "idle";
        void cancelRef.current().finally(() => setPhase("idle"));
      };
      const subscription = AppState.addEventListener("change", (state) => {
        if (state !== "active") cancel();
      });
      return () => {
        active.current = false;
        cancel();
        subscription.remove();
      };
    }, []),
  );

  const stopAndSend = async () => {
    if (phaseRef.current !== "recording") return;
    clearTimer();
    setVoicePhase("sending");
    try {
      await stopAndUpload();
    } finally {
      setVoicePhase("idle");
    }
  };
  const stopAndSendRef = useRef(stopAndSend);
  useEffect(() => {
    stopAndSendRef.current = stopAndSend;
  });

  const start = () => {
    if (phaseRef.current !== "idle" || permissionPending.current) return;
    if (!isMicUsable) {
      permissionPending.current = true;
      void requestMic()
        .then((status) => {
          if (!active.current) return;
          if (status === "blocked") {
            Alert.alert(t("chat.micPermissionTitle"), t("chat.micPermissionBlocked"), [
              { text: t("chat.cancel"), style: "cancel" },
              { text: t("chat.openSettings"), onPress: openSettings },
            ]);
          } else {
            Toast.show({
              type: status === "granted" ? "info" : "error",
              text1: t(status === "granted" ? "chat.micReady" : "chat.micPermissionRequired"),
            });
          }
        })
        .finally(() => {
          permissionPending.current = false;
        });
      return;
    }
    Keyboard.dismiss();
    // Before the mic opens: iOS mutes haptics while recording.
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    recordingGeneration.current = generation.current;
    setVoicePhase("recording");
    setElapsedMs(0);
    const startedAt = Date.now();
    timer.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setElapsedMs(elapsed);
      if (elapsed >= MAX_RECORDING_MS) void stopAndSendRef.current();
    }, 250);
    startListening();
  };

  const cancel = async () => {
    if (phaseRef.current !== "recording") return;
    clearTimer();
    generation.current += 1;
    phaseRef.current = "idle";
    try {
      await cancelListening();
    } finally {
      setPhase("idle");
    }
  };

  useEffect(() => clearTimer, []);

  return { phase, busy: phase !== "idle", elapsedMs, start, stopAndSend, cancel };
}
