import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  FlatList,
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
import { AiCoachRating, EditedDraftDto, MessageFeedbackDto } from "../models/ai-coach-dto";
import { transcribeAudio } from "../services/ai-coach-service";
import { ReturnButton } from "@/shared/components/return-button";
import { TaskDraftCard } from "./task-draft-card";
import { MessageFeedbackActions } from "./message-feedback-actions";

function MessageBubble({ item, rateable, feedback, feedbackBusy, onRate, onSaveDetail }: {
  item: ChatItem;
  rateable: boolean;
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
      {!isUser && <MessageFeedbackActions text={item.text} rateable={rateable} feedback={feedback}
        busy={feedbackBusy} onRate={onRate} onSaveDetail={onSaveDetail} />}
    </View>
  );
}

/** Virtualized newest-first timeline; older pages preserve the current scroll position. */
export function ExecutionChatPanel() {
  const { t, i18n } = useTranslation("aiCoach");
  const { snapshot, messages, status, start, send, confirm, edit, reject,
    feedbackByMessage, feedbackSaving, rateMessage, saveFeedbackDetail,
    newTopic, clearChat, loadOlder, loadingOlder, historyError, retryHistory } = useAiCoachChat();
  const [input, setInput] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [calendarNow, setCalendarNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setCalendarNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const scrollRef = useRef<FlatList<ChatItem>>(null);
  const nearLatest = useRef(true);

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
      setInput(text);
      Toast.show({ type: "error", text1: t("chat.sendError") });
    }
    scrollRef.current?.scrollToOffset({ offset: 0, animated: true });
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
    Toast.show({ type: "error", text1: t(outcome.errorCode === "ScheduleInPast" ? "draft.timePassed" : outcome.errorCode === "ScheduleConflict"
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

  const runMenuAction = async (action: () => Promise<string | null>) => {
    const error = await action();
    if (error) Toast.show({ type: "error", text1: t(error === "ConversationBusy" ? "chat.busy" : "chat.actionFailed") });
    else scrollRef.current?.scrollToOffset({ offset: 0, animated: false });
  };
  const openMenu = () => Alert.alert(t("chat.menu"), undefined, [
    { text: t("chat.newTopic"), onPress: () => void runMenuAction(newTopic) },
    { text: t("chat.clearHistory"), style: "destructive", onPress: () =>
      Alert.alert(t("chat.clearTitle"), t("chat.clearDescription"), [
        { text: t("draft.cancel"), style: "cancel" },
        { text: t("chat.clearHistory"), style: "destructive", onPress: () => void runMenuAction(clearChat) },
      ]) },
    { text: t("draft.cancel"), style: "cancel" },
  ]);
  const dayKey = (value: string) => {
    const date = new Date(value);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  };
  const dateLabel = (value: string) => {
    const today = new Date(calendarNow);
    if (dayKey(value) === dayKey(today.toISOString())) return t("chat.today");
    today.setDate(today.getDate() - 1);
    if (dayKey(value) === dayKey(today.toISOString())) return t("chat.yesterday");
    const date = new Date(value);
    return date.toLocaleDateString(i18n.resolvedLanguage ?? i18n.language, {
      day: "numeric", month: "short", ...(date.getFullYear() !== calendarNow.getFullYear() ? { year: "numeric" } : {}),
    });
  };

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View className="flex-row items-center justify-between px-5 py-2">
        <ReturnButton onPress={() => router.back()} />
        <Text className="font-balooBold text-lg text-secondary">{t("chat.title")}</Text>
        <Pressable onPress={openMenu} disabled={status !== "ready" || generating || snapshot?.artifacts.some(card => card.status === "processing")}
          accessibilityLabel={t("chat.menu")} hitSlop={12}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#8C8C8C" />
        </Pressable>
      </View>
      <FlatList
        ref={scrollRef}
        data={messages}
        inverted
        keyExtractor={(item) => item.id}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingVertical: 12 }}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        keyboardShouldPersistTaps="handled"
        onEndReached={loadOlder}
        onEndReachedThreshold={0.3}
        onScroll={(event) => { nearLatest.current = event.nativeEvent.contentOffset.y < 80; }}
        scrollEventThrottle={32}
        onContentSizeChange={() => { if (nearLatest.current) scrollRef.current?.scrollToOffset({ offset: 0, animated: false }); }}
        ListFooterComponent={<View>
          {loadingOlder && <ActivityIndicator />}
          {historyError && <Pressable onPress={retryHistory}><Text className="font-baloo text-primary text-center py-3">{t("chat.historyError")}</Text></Pressable>}
          {messages.length === 0 && status === "ready" && <Text className="font-baloo text-primary text-center py-6">{t("home.intro")}</Text>}
        </View>}
        ListHeaderComponent={<View>
          {status === "connecting" && <ActivityIndicator />}
          {status === "startFailed" && <Pressable onPress={() => void start()}>
            <Text className="font-baloo text-warning p-3">{t("chat.startError")}</Text>
          </Pressable>}
          {generating && <Text className="font-baloo text-primary p-3">{t("chat.thinking")}</Text>}
          {blockedBanner()}
        </View>}
        renderItem={({ item, index }) => {
          const older = messages[index + 1];
          const active = item.conversationId === snapshot?.conversationId;
          return <View>
            {(!older || dayKey(older.createdAt) !== dayKey(item.createdAt)) &&
              <Text className="font-baloo text-xs text-primary text-center my-3">{dateLabel(item.createdAt)}</Text>}
            {item.topicStart && <View className="border-t border-gray-200 mt-3 mb-2 pt-2">
              <Text className="font-baloo text-xs text-primary text-center">{t("chat.topicStart")}</Text>
            </View>}
            <MessageBubble item={item} rateable={active} feedback={feedbackByMessage[item.id]}
              feedbackBusy={feedbackSaving[item.id] === true}
              onRate={(rating) => rateMessage(item.id, rating)}
              onSaveDetail={(reason, detail) => saveFeedbackDetail(item.id, reason, detail)} />
            {item.draftSnapshot.map((historical) => {
              const live = active ? snapshot?.artifacts.find(card => card.id === historical.id) : undefined;
              const artifact = live ?? (!active && historical.status === "pending" ? { ...historical, status: "expired" as const } : historical);
              return <TaskDraftCard key={artifact.id} artifact={artifact} readOnly={!live}
                busy={status === "sending" || snapshot?.generationStatus === "running"}
                onConfirm={(action, edited, selectedIds, allowConflict, token) =>
                  void handleConfirm(artifact.id, action, edited, selectedIds, allowConflict, token)}
                onEdit={(edited) => edit(artifact.id, edited)}
                onReject={() => void reject(artifact.id).then(error => {
                  if (error) Toast.show({ type: "error", text1: t("draft.editFailed") });
                })} />;
            })}
          </View>;
        }}
      />

      {/* TEMPORARY debug line (2026-08-24): session token usage — remove with snapshot.debugUsage. */}
      {snapshot?.debugUsage && (
        <Text className="font-baloo text-[11px] text-primary text-center pb-0.5 opacity-60">
          {`${snapshot.debugUsage.totalTokens.toLocaleString()} tokens (in ${snapshot.debugUsage.inputTokens.toLocaleString()} / out ${snapshot.debugUsage.outputTokens.toLocaleString()})${
            snapshot.debugUsage.estUsd != null ? ` · $${snapshot.debugUsage.estUsd.toFixed(4)}` : ""
          }`}
        </Text>
      )}

      <View className="flex-row items-center px-4 py-2 gap-2">
        <TextInput
          className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 font-baloo text-base text-secondary bg-white"
          placeholder={isRecording ? t("chat.listening") : t("chat.inputPlaceholder")}
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
