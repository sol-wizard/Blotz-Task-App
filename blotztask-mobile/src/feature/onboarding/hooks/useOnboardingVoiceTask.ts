import { useEffect, useRef, useState } from "react";
import { getRecordingPermissionsAsync } from "expo-audio";
import { useAiTaskGenerator } from "@/feature/ai-task-generate/hooks/useAiTaskGenerator";
import { useVoiceRecorder } from "@/feature/ai-task-generate/hooks/useVoiceRecorder";
import { useHoldToTalk } from "@/feature/ai-task-generate/hooks/useHoldToTalk";
import { useSaveAiResults } from "@/feature/ai-task-generate/hooks/useSaveAiResults";
import { resolveMicPermission } from "@/feature/ai-task-generate/utils/resolve-mic-permission";
import { mapExtractedTaskDTOToAiTaskDTO } from "@/feature/ai-task-generate/utils/map-extracted-to-task-dto";
import { mapExtractedRecurringToDTO } from "@/feature/ai-task-generate/utils/map-extracted-recurring-to-dto";
import { useAllLabels } from "@/shared/hooks/useAllLabels";
import type {
  AiTaskInputMode,
  OnboardingVoiceFailure,
  OnboardingVoiceSkipVia,
} from "@/shared/constants/posthog-events";
import { analytics } from "@/shared/services/analytics";

// Backend codes that mean "we got audio but no usable words".
const NO_SPEECH_ERROR_CODES = ["EmptyAudio", "TranscriptionFailed"];
const NETWORK_ERROR_CODES = ["NetworkError", "NotConnected"];

/** State and handlers for the try-voice step of onboarding. */
export function useOnboardingVoiceTask() {
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [inputMode, setInputMode] = useState<AiTaskInputMode>("voice");
  const [isMicGranted, setIsMicGranted] = useState(false);
  const [isMicUnavailable, setIsMicUnavailable] = useState(false);
  const [isMicReadyHintVisible, setIsMicReadyHintVisible] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [notice, setNotice] = useState<OnboardingVoiceFailure>("none");
  const [isCreated, setIsCreated] = useState(false);

  const attemptsRef = useRef(0);
  const lastFailureRef = useRef<OnboardingVoiceFailure>("none");
  const lastInputModeRef = useRef<AiTaskInputMode>("voice");
  const hasReportedExitRef = useRef(false);
  // Read by reportExit in the same tick confirmDrafts resolves, before isCreated re-renders.
  const isCreatedRef = useRef(false);
  const audioSubmitThrewRef = useRef(false);
  // A ref, not the isPressing state: a quick tap releases before the state has re-rendered.
  const didStartRecordingRef = useRef(false);

  const fail = (reason: OnboardingVoiceFailure) => {
    lastFailureRef.current = reason;
    setNotice(reason);
  };

  const {
    transcript,
    streamedTasks,
    streamedNotes,
    streamedRecurringTasks,
    submitAudioForTranscription,
    sendTextMessage,
    deleteDraftTask,
    deleteDraftNote,
    deleteDraftRecurringTask,
  } = useAiTaskGenerator({
    setIsAiGenerating,
    onComplete: (result, completedInputMode) => {
      const taskCount =
        (result.extractedTasks?.length ?? 0) +
        (result.extractedRecurringTasks?.length ?? 0) +
        (result.extractedNotes?.length ?? 0);

      if (taskCount === 0) {
        fail("no_task");
        return;
      }

      setNotice("none");
      analytics.trackOnboardingVoiceTaskGenerated({
        inputMode: completedInputMode ?? lastInputModeRef.current,
        taskCount,
        attempt: attemptsRef.current,
      });
    },
    onError: (errorCode) => {
      if (NO_SPEECH_ERROR_CODES.includes(errorCode)) fail("no_speech");
      else if (NETWORK_ERROR_CODES.includes(errorCode)) fail("network");
      else fail("error");
    },
  });

  // stopAndUpload only reports true/false, so note when the upload itself was what failed.
  const submitAudio = async (uri: string) => {
    try {
      await submitAudioForTranscription(uri);
    } catch (error) {
      audioSubmitThrewRef.current = true;
      throw error;
    }
  };

  const { isRecording, startListening, stopAndUpload, cancelListening } =
    useVoiceRecorder(submitAudio);

  const holdToTalk = useHoldToTalk({
    startListening,
    stopAndUpload,
    cancelListening,
    onSubmitResult: (didSubmit) => {
      if (didSubmit) return;
      fail(audioSubmitThrewRef.current ? "network" : "no_speech");
      audioSubmitThrewRef.current = false;
    },
  });

  const { labels } = useAllLabels();
  const { saveAll, isSaving } = useSaveAiResults("onboarding_ai");

  const tasks = streamedTasks.map((task) => mapExtractedTaskDTOToAiTaskDTO(task, labels ?? []));
  const recurringTasks = streamedRecurringTasks.map((task) =>
    mapExtractedRecurringToDTO(task, labels ?? []),
  );
  const notes = streamedNotes;
  const draftCount = tasks.length + recurringTasks.length + notes.length;
  const hasDrafts = draftCount > 0;

  // Someone who already granted the mic (a reinstall, a second account) should not need a
  // wasted first press. This check never shows a prompt.
  useEffect(() => {
    getRecordingPermissionsAsync()
      .then((current) => {
        if (current.granted) setIsMicGranted(true);
      })
      .catch((error: unknown) => console.warn("[Mic] Permission pre-check failed.", error));
  }, []);

  // The system prompt is asked for on the first press, not on mount: a prompt with no context
  // right after login gets refused more often.
  const askForMic = async () => {
    const outcome = await resolveMicPermission();
    if (outcome === "granted" || outcome === "already_granted") {
      setIsMicGranted(true);
      setIsMicReadyHintVisible(true);
      return;
    }
    setIsMicUnavailable(true);
    setInputMode("text");
    fail("permission_denied");
  };

  const onMicPressIn = () => {
    attemptsRef.current += 1;
    analytics.trackOnboardingVoiceMicPressed({ attempt: attemptsRef.current });

    if (!isMicGranted) {
      void askForMic();
      return;
    }

    lastInputModeRef.current = "voice";
    didStartRecordingRef.current = true;
    setIsPressing(true);
    setIsMicReadyHintVisible(false);
    setNotice("none");
    holdToTalk.onPressIn();
  };

  const onMicPressOut = () => {
    // The press that opened the permission prompt never started a recording.
    if (!didStartRecordingRef.current) return;
    didStartRecordingRef.current = false;
    setIsPressing(false);
    holdToTalk.onPressOut();
  };

  const submitText = async (text: string) => {
    if (!text.trim() || isAiGenerating) return;
    attemptsRef.current += 1;
    lastInputModeRef.current = "text";
    setNotice("none");
    await sendTextMessage(text.trim());
  };

  const switchToText = () => {
    holdToTalk.hideHoldHint();
    setInputMode("text");
  };

  const switchToVoice = () => setInputMode("voice");

  /** Saves the drafts. Resolves true when the carousel should move on. */
  const confirmDrafts = async (): Promise<boolean> => {
    const allSucceeded = await saveAll({ tasks, recurringTasks, notes });
    if (!allSucceeded) return false;

    isCreatedRef.current = true;
    setIsCreated(true);
    analytics.trackOnboardingVoiceTaskCreated({
      inputMode: lastInputModeRef.current,
      taskCount: draftCount,
    });
    return true;
  };

  /** Call when the user leaves this step. Reports a skip once, and only if nothing was saved. */
  const reportExit = (via: OnboardingVoiceSkipVia) => {
    if (isCreatedRef.current || hasReportedExitRef.current) return;
    hasReportedExitRef.current = true;
    analytics.trackOnboardingVoiceSkipped({
      via,
      attempts: attemptsRef.current,
      lastFailure: lastFailureRef.current,
    });
  };

  return {
    // state
    inputMode,
    isMicUnavailable,
    isMicReadyHintVisible,
    isRecording,
    isPressing,
    isAiGenerating,
    isSaving,
    isCreated,
    notice,
    transcript,
    tasks,
    recurringTasks,
    notes,
    hasDrafts,
    isHoldHintVisible: holdToTalk.isHoldHintVisible,
    micShakeStyle: holdToTalk.micShakeStyle,
    minHoldMs: holdToTalk.minHoldMs,
    // Swiping away would steal the hold, or silently drop drafts the user has not confirmed.
    isSwipeLocked: isPressing || isRecording || isAiGenerating || (hasDrafts && !isCreated),
    // handlers
    onMicPressIn,
    onMicPressOut,
    onMicHeldLongEnough: holdToTalk.onHeldLongEnough,
    submitText,
    switchToText,
    switchToVoice,
    deleteDraftTask,
    deleteDraftNote,
    deleteDraftRecurringTask,
    confirmDrafts,
    reportExit,
  };
}

export type OnboardingVoiceTask = ReturnType<typeof useOnboardingVoiceTask>;
