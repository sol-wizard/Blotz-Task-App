import { ReactNode, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { useVoiceRecorder } from "@/feature/ai-task-generate/hooks/useVoiceRecorder";
import { useAiCoachChat, ConfirmAction, ChatItem } from "../hooks/useAiCoachChat";
import { AiCoachRating, AvailableAiCoachMode, EditedDraftDto, MessageFeedbackDto } from "../models/ai-coach-dto";
import { transcribeAudio } from "../services/ai-coach-service";
import { TaskDraftCard } from "./task-draft-card";
import { MessageFeedbackActions } from "./message-feedback-actions";

function MessageBubble({ item, feedback, feedbackBusy, onRate, onSaveDetail }: {
  item: ChatItem;
  feedback: MessageFeedbackDto | undefined;
  feedbackBusy: boolean;
  onRate: (rating: AiCoachRating) => Promise<boolean>;
  onSaveDetail: (reason: string | null, detail: string | null) => Promise<boolean>;
}) {
  const { t } = useTranslation("aiCoach");
  const isUser = item.role === "user";
  return (
    <View className={`my-1 max-w-[85%] ${isUser ? "self-end" : "self-start"}`}>
      <View
        className={`rounded-2xl px-4 py-2.5 ${isUser ? "bg-highlight" : "bg-white border border-gray-100"}`}
      >
        <Text className={`font-baloo text-base ${isUser ? "text-white" : "text-secondary"}`}>
          {item.text}
        </Text>
      </View>
      {!isUser && item.taskContextRead && (
        <Text className="font-baloo text-xs text-primary mt-1 ml-2">
          {t("chat.taskContextRead")}
        </Text>
      )}
      {!isUser && <MessageFeedbackActions text={item.text} feedback={feedback}
        busy={feedbackBusy} onRate={onRate} onSaveDetail={onSaveDetail} />}
    </View>
  );
}

interface ExecutionChatPanelProps {
  /** Null = mode not picked yet: input bar shows greyed, no conversation is started. */
  mode: AvailableAiCoachMode | null;
  /** Page content (greeting + mode cards) that scrolls together with the transcript. */
  header: ReactNode;
}

/**
 * Shared AI Coach chat, living directly on AI Home (single-page per PM
 * decision 2026-08-22). The input bar is always on screen — grey until `enabled` — and the
 * transcript grows in place below the header, so picking a mode never feels like a page jump.
 * The draft card and every action button appear only when the server's snapshot allows them.
 */
export function ExecutionChatPanel({ mode, header }: ExecutionChatPanelProps) {
  const { t } = useTranslation("aiCoach");
  const { snapshot, messages, status, start, send, confirm, edit, reject,
    feedbackByMessage, feedbackSaving, rateMessage, saveFeedbackDetail } = useAiCoachChat(mode);
  const [input, setInput] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const enabled = mode !== null;

  // Hold-to-talk: the transcript lands in the input box for review — never auto-sent.
  const { isRecording, startListening, stopAndUpload } = useVoiceRecorder(async (uri) => {
    setTranscribing(true);
    try {
      const text = await transcribeAudio(uri);
      setInput((prev) => (prev.trim().length > 0 ? `${prev.trim()} ${text}` : text));
    } catch {
      Toast.show({ type: "error", text1: t("chat.transcribeFailed") });
    } finally {
      setTranscribing(false);
    }
  });

  const generating = status === "sending" || snapshot?.generationStatus === "running";
  const canSend = status === "ready" && snapshot?.allowedActions.includes("send_message") === true;

  const handleSend = async () => {
    const text = input;
    setInput("");
    const errorCode = await send(text);
    if (errorCode) {
      Toast.show({ type: "error", text1: t("chat.sendError") });
    }
  };

  const handleConfirm = async (draftId: string, action: ConfirmAction, edited: EditedDraftDto,
    selectedItemIds: string[], allowScheduleConflict = false, acceptedConflictToken?: string | null): Promise<void> => {
    const outcome = await confirm(draftId, action, edited, selectedItemIds, allowScheduleConflict, acceptedConflictToken);

    if (outcome.result?.status === "succeeded") {
      const directive = outcome.result.clientDirective;
      const [persisted] = outcome.result.persistedEntities;
      if (directive?.type === "start_focus" && persisted) {
        // Focus uses the server-confirmed task and duration.
        // Only ever issued for a single-task card, so the one persisted entity is the task.
        router.push({
          pathname: "/pomodoro-focus",
          params: {
            taskId: persisted.id,
            focusMinutes: String(directive.focusMinutes),
          },
        });
      }
      return;
    }

    if (outcome.errorCode === "ScheduleConflict" && outcome.scheduleAssessment?.conflictToken) {
      const assessment = outcome.scheduleAssessment;
      Alert.alert(t("draft.scheduleConflictTitle"),
        t("draft.scheduleConflictConfirm") + "\n" +
          t("draft.scheduleConflict", { tasks: [...new Set(assessment.conflicts.map((entry) => entry.taskTitle))].join("、") }), [
          { text: t("draft.cancel"), style: "cancel" },
          { text: t("draft.saveDespiteConflict"), onPress: () =>
            void handleConfirm(draftId, action, edited, selectedItemIds, true, assessment.conflictToken) },
        ]);
      return;
    }

    // Failed persistence keeps the draft retryable; conflicts already resynced the UI.
    Toast.show({ type: "error", text1: t(outcome.errorCode === "ScheduleConflict"
      ? "draft.scheduleChanged" : outcome.errorCode === "ScheduleUnverified"
        ? "draft.scheduleUnverified" : "draft.saveFailed") });
  };

  const blockedBanner = () => {
    if (snapshot?.generationStatus !== "failed") return null;
    if (snapshot.generationError === "quota") {
      return (
        <View className="bg-white border border-gray-200 rounded-2xl p-4 my-2">
          <Text className="font-baloo text-sm text-secondary">{t("chat.quotaBlocked")}</Text>
          <Pressable
            className="bg-highlight rounded-xl py-2 items-center mt-3"
            onPress={() => router.push("/task-create")}
          >
            <Text className="font-balooBold text-white text-sm">{t("chat.createManually")}</Text>
          </Pressable>
        </View>
      );
    }
    const key =
      snapshot.generationError === "content_filtered"
        ? "chat.contentFiltered"
        : snapshot.generationError === "model_unavailable"
          ? "chat.modelUnavailable"
          : "chat.generationFailed";
    return (
      <View className="bg-white border border-gray-200 rounded-2xl p-3 my-2">
        <Text className="font-baloo text-sm text-primary">{t(key)}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 12 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {header}

        {status === "connecting" && (
          <View className="self-start bg-white border border-gray-100 rounded-2xl px-4 py-2.5 my-1">
            <ActivityIndicator size="small" />
          </View>
        )}

        {status === "startFailed" && (
          <Pressable
            className="self-start bg-white border border-gray-200 rounded-2xl px-4 py-2.5 my-1"
            onPress={() => void start()}
          >
            <Text className="font-baloo text-sm text-warning">{t("chat.startError")}</Text>
          </Pressable>
        )}

        {messages.map((item) => (
          <MessageBubble key={item.id} item={item} feedback={feedbackByMessage[item.id]}
            feedbackBusy={feedbackSaving[item.id] === true}
            onRate={(rating) => rateMessage(item.id, rating)}
            onSaveDetail={(reason, detail) => saveFeedbackDetail(item.id, reason, detail)} />
        ))}

        {generating && (
          <View className="self-start bg-white border border-gray-100 rounded-2xl px-4 py-2.5 my-1">
            <Text className="font-baloo text-base text-primary">{t("chat.thinking")}</Text>
          </View>
        )}

        {snapshot?.artifacts
          .filter((artifact) => artifact.status !== "rejected")
          .map((artifact) => (
            <TaskDraftCard
              key={artifact.id}
              artifact={artifact}
              busy={status === "sending" || snapshot.generationStatus === "running"}
              onConfirm={(action, edited, selectedItemIds, allowScheduleConflict, acceptedConflictToken) =>
                void handleConfirm(artifact.id, action, edited, selectedItemIds, allowScheduleConflict, acceptedConflictToken)}
              onEdit={(edited) => edit(artifact.id, edited)}
              onReject={() =>
                void reject(artifact.id).then((error) => {
                  if (error) Toast.show({ type: "error", text1: t("draft.editFailed") });
                })
              }
            />
          ))}

        {blockedBanner()}
      </ScrollView>

      {/* TEMPORARY debug line (2026-08-24): session token usage — remove with snapshot.debugUsage. */}
      {snapshot?.debugUsage && (
        <Text className="font-baloo text-[11px] text-primary text-center pb-0.5 opacity-60">
          {`${snapshot.debugUsage.totalTokens.toLocaleString()} tokens (in ${snapshot.debugUsage.inputTokens.toLocaleString()} / out ${snapshot.debugUsage.outputTokens.toLocaleString()})${
            snapshot.debugUsage.estUsd != null ? ` · $${snapshot.debugUsage.estUsd.toFixed(4)}` : ""
          }`}
        </Text>
      )}

      <View className={`flex-row items-center px-4 py-2 gap-2 ${enabled ? "" : "opacity-50"}`}>
        <TextInput
          className={`flex-1 border border-gray-200 rounded-full px-4 py-2.5 font-baloo text-base text-secondary ${
            enabled ? "bg-white" : "bg-gray-100"
          }`}
          placeholder={
            isRecording
              ? t("chat.listening")
              : enabled
                ? t(
                    mode === "Companion"
                      ? "chat.companionInputPlaceholder"
                      : "chat.inputPlaceholder",
                  )
                : t("home.pickModeFirst")
          }
          placeholderTextColor={isRecording ? "#F56767" : "#8C8C8C"}
          value={input}
          onChangeText={setInput}
          editable={canSend && !isRecording}
          onSubmitEditing={() => void handleSend()}
          returnKeyType="send"
          maxLength={2000}
        />
        <Pressable
          className={`w-11 h-11 rounded-full items-center justify-center ${
            isRecording ? "bg-warning" : "bg-gray-200"
          }`}
          disabled={!canSend || transcribing}
          onPressIn={() => startListening()}
          onPressOut={() => void stopAndUpload()}
          accessibilityLabel={t("chat.holdToTalk")}
        >
          {transcribing ? (
            <ActivityIndicator size="small" color="#8C8C8C" />
          ) : (
            <Ionicons name="mic" size={20} color={isRecording ? "#FFFFFF" : "#8C8C8C"} />
          )}
        </Pressable>
        <Pressable
          className={`w-11 h-11 rounded-full items-center justify-center ${
            canSend && input.trim().length > 0 ? "bg-highlight" : "bg-gray-200"
          }`}
          disabled={!canSend || input.trim().length === 0}
          onPress={() => void handleSend()}
        >
          <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
