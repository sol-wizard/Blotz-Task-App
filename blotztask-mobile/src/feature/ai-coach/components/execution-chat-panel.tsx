import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
import { router, useFocusEffect, useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import Toast from "react-native-toast-message";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { useVoiceRecorder } from "@/feature/ai-task-generate/hooks/useVoiceRecorder";
import { useAiCoachChat, ConfirmAction, ChatItem } from "../hooks/useAiCoachChat";
import { AiCoachRating, EditedDraftDto, MessageFeedbackDto } from "../models/ai-coach-dto";
import { transcribeAudio } from "../services/ai-coach-service";
import { ReturnButton } from "@/shared/components/return-button";
import { TaskDraftCard } from "./task-draft-card";
import { MessageFeedbackActions } from "./message-feedback-actions";
import { CoachMarkdown } from "./coach-markdown";
import { ReviewListBar } from "./review-list-bar";
import { FollowUpChips } from "./follow-up-chips";
import { ReviewListModal } from "./review-list-modal";

function StreamingCursor() {
  const { t } = useTranslation("aiCoach");
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const blink = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.25, duration: 500, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]));
    blink.start();
    return () => blink.stop();
  }, [opacity]);
  return <Animated.Text accessibilityLabel={t("chat.generating")} style={{ opacity }} className="font-baloo text-primary">▍</Animated.Text>;
}

function MessageBubble({ item, rateable, feedback, feedbackBusy, onRate, onSaveDetail }: {
  item: ChatItem;
  rateable: boolean;
  feedback: MessageFeedbackDto | undefined;
  feedbackBusy: boolean;
  onRate: (rating: AiCoachRating) => Promise<boolean>;
  onSaveDetail: (reason: string | null, detail: string | null) => Promise<boolean>;
}) {
  const { t } = useTranslation("aiCoach");
  if (item.role === "user") {
    return (
      <View className="my-1.5 max-w-[82%] self-end rounded-[20px] rounded-br-md px-4 py-2.5 bg-secondary">
        <Text className="font-baloo text-base text-white">{item.text}</Text>
      </View>
    );
  }
  return (
    <View className="my-1.5 flex-row gap-2 self-stretch">
      <CoachAvatar />
      {/* Assistant replies take the remaining width so headings and lists have room to breathe. */}
      <View className="flex-1">
        {item.taskContextRead && (
          <View className="self-start flex-row items-center gap-1 rounded-full bg-[#EAF3FC] px-2.5 py-0.5 mb-1">
            <Ionicons name="search" size={11} color="#3D8DE0" />
            <Text className="font-baloo text-xs text-info">{t("chat.taskContextRead")}</Text>
          </View>
        )}
        <CoachMarkdown text={item.text} />
        {item.streaming && <StreamingCursor />}
        {!item.streaming && <MessageFeedbackActions text={item.text} rateable={rateable} feedback={feedback}
          busy={feedbackBusy} onRate={onRate} onSaveDetail={onSaveDetail} />}
      </View>
    </View>
  );
}

function CoachAvatar() {
  return (
    <View className="w-7 h-7 rounded-full bg-checked items-center justify-center mt-0.5">
      <Text className="font-balooExtraBold text-sm text-white">B</Text>
    </View>
  );
}

/** Three pulsing dots next to the coach avatar while the first token is pending. */
function TypingIndicator({ label }: { label: string }) {
  const [dots] = useState(() => [0, 1, 2].map(() => new Animated.Value(0.3)));
  useEffect(() => {
    const loop = Animated.loop(Animated.stagger(160, dots.map(dot => Animated.sequence([
      Animated.timing(dot, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(dot, { toValue: 0.3, duration: 320, useNativeDriver: true }),
    ]))));
    loop.start();
    return () => loop.stop();
  }, [dots]);
  return (
    <View className="my-1.5 flex-row gap-2" accessibilityLabel={label} accessibilityLiveRegion="polite">
      <CoachAvatar />
      <View className="flex-row items-center gap-1 rounded-[20px] rounded-tl-md bg-white px-4 py-3">
        {dots.map((opacity, index) => (
          <Animated.View key={index} style={{ opacity }} className="w-1.5 h-1.5 rounded-full bg-primary" />
        ))}
      </View>
    </View>
  );
}

/** Virtualized newest-first timeline; older pages preserve the current scroll position. */
export function ExecutionChatPanel() {
  const { t, i18n } = useTranslation("aiCoach");
  const { snapshot, messages, status, start, send, confirm, edit, reject,
    feedbackByMessage, feedbackSaving, rateMessage, saveFeedbackDetail,
    pendingList, pendingCount, reviewBusy, confirmationUncertain, streaming, reconnecting,
    updateReviewItem, removeReviewItem, confirmAll, refreshReviewList,
    newTopic, clearChat, loadOlder, loadingOlder, historyError, retryHistory } = useAiCoachChat();
  const [input, setInput] = useState("");
  const [reviewVisible, setReviewVisible] = useState(false);
  const [remindedBatches, setRemindedBatches] = useState<Set<string>>(() => new Set());
  // Only lists the user has edited earn a leave reminder; untouched AI captures may be ignored freely.
  const [touchedBatches, setTouchedBatches] = useState<Set<string>>(() => new Set());
  const markTouched = (listId: string) => setTouchedBatches(previous => new Set(previous).add(listId));
  const navigation = useNavigation();
  useFocusEffect(useCallback(() => { setRemindedBatches(new Set()); }, []));
  const needsLeaveReminder = !!pendingList && pendingCount > 0 && touchedBatches.has(pendingList.id)
    && !remindedBatches.has(pendingList.id);
  const remindBeforeLeaving = (leave: () => void) => {
    if (!needsLeaveReminder || !pendingList) { leave(); return; }
    setRemindedBatches(previous => new Set(previous).add(pendingList.id));
    Alert.alert(t("review.leaveTitle"), t("review.leaveDescription", { count: pendingCount }), [
      { text: t("review.keepReviewing"), style: "cancel", onPress: () => setReviewVisible(true) },
      { text: t("review.leave"), onPress: leave },
    ]);
  };
  usePreventRemove(needsLeaveReminder && !reviewVisible, ({ data }) => {
    remindBeforeLeaving(() => navigation.dispatch(data.action));
  });
  const [transcribing, setTranscribing] = useState(false);
  const [calendarNow, setCalendarNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setCalendarNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const scrollRef = useRef<FlatList<ChatItem>>(null);
  const nearLatest = useRef(true);
  useEffect(() => {
    if (status !== "connecting") return;
    nearLatest.current = true;
    scrollRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [status]);

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
  const canSend = status === "ready" && !confirmationUncertain && snapshot?.allowedActions.includes("send_message") === true;

  const handleSend = async () => {
    if (!canSend || !input.trim()) return;
    const text = input;
    setInput("");
    const errorCode = await send(text);
    if (errorCode) {
      setInput(current => current.trim() ? current : text);
      Toast.show({ type: "error", text1: t("chat.sendError") });
    }
    if (nearLatest.current) scrollRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // A tapped follow-up leaves any draft in the input untouched.
  const handleFollowUp = async (text: string) => {
    if (!canSend) return;
    scrollRef.current?.scrollToOffset({ offset: 0, animated: true });
    if (await send(text, "followup")) Toast.show({ type: "error", text1: t("chat.sendError") });
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
        <View className="bg-white rounded-3xl p-4 my-2 ml-9">
          <Text className="font-baloo text-sm text-secondary">{t("chat.quotaBlocked")}</Text>
          <Pressable
            className="bg-highlight rounded-2xl py-3 items-center mt-3"
            onPress={() => remindBeforeLeaving(() => router.push("/task-create"))}
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
      <View className="bg-[#FFF7ED] rounded-2xl px-3 py-2.5 my-2 ml-9">
        <Text className="font-baloo text-sm text-[#C2410C]">{t(key)}</Text>
      </View>
    );
  };

  const runMenuAction = async (action: () => Promise<string | null>) => {
    const error = await action();
    if (error) Toast.show({ type: "error", text1: t(error === "ConversationBusy" ? "chat.busy" : "chat.actionFailed") });
    else scrollRef.current?.scrollToOffset({ offset: 0, animated: false });
  };
  const openMenu = () => Alert.alert(t("chat.menu"), undefined, [
    { text: t("chat.newTopic"), onPress: () => {
      if (!pendingCount) { void runMenuAction(newTopic); return; }
      Alert.alert(t("review.newTopicTitle"), t("review.newTopicDescription", { count: pendingCount }), [
        { text: t("review.keepReviewing"), style: "cancel", onPress: () => setReviewVisible(true) },
        { text: t("chat.newTopic"), style: "destructive", onPress: () => void runMenuAction(newTopic) },
      ]);
    } },
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
        <Pressable onPress={openMenu} disabled={confirmationUncertain || status !== "ready" || generating || snapshot?.artifacts.some(card => card.status === "processing")}
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
          {reconnecting ? <Text className="font-baloo text-primary p-3">{t("chat.reconnecting")}</Text>
            : generating && !messages.some(item => item.streaming) && <TypingIndicator label={t("chat.thinking")} />}
          {blockedBanner()}
        </View>}
        renderItem={({ item, index }) => {
          const older = messages[index + 1];
          const active = item.conversationId === snapshot?.conversationId;
          return <View>
            {(!older || dayKey(older.createdAt) !== dayKey(item.createdAt)) &&
              <View className="self-center rounded-full bg-white px-3 py-0.5 my-3">
                <Text className="font-baloo text-xs text-primary">{dateLabel(item.createdAt)}</Text>
              </View>}
            {item.topicStart && <View className="flex-row items-center gap-3 mt-3 mb-2">
              <View className="flex-1 h-px bg-gray-200" />
              <Text className="font-baloo text-xs text-primary">{t("chat.topicStart")}</Text>
              <View className="flex-1 h-px bg-gray-200" />
            </View>}
            <MessageBubble item={item} rateable={active} feedback={feedbackByMessage[item.id]}
              feedbackBusy={feedbackSaving[item.id] === true}
              onRate={(rating) => rateMessage(item.id, rating)}
              onSaveDetail={(reason, detail) => saveFeedbackDetail(item.id, reason, detail)} />
            {item.draftSnapshot.map((historical) => {
              const live = active ? snapshot?.artifacts.find(card => card.id === historical.id) : undefined;
              const artifact = live ?? (!active && historical.status === "pending" ? { ...historical, status: "expired" as const } : historical);
              if (artifact.isReviewList) return null;
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

      {!generating && <FollowUpChips items={snapshot?.followUps ?? []} disabled={!canSend}
        onSend={(text) => void handleFollowUp(text)} />}
      <ReviewListBar count={pendingCount} saving={pendingList?.status === "processing"}
        generating={streaming || snapshot?.generationStatus === "running"}
        onOpen={() => setReviewVisible(true)} />
      {confirmationUncertain && !pendingCount && <Pressable className="px-4 py-2" onPress={() => setReviewVisible(true)}>
        <Text className="font-baloo text-warning text-sm">{t("review.confirmationUnknown")}</Text>
      </Pressable>}
      <ReviewListModal visible={reviewVisible} list={pendingList} conversationVersion={snapshot?.conversationVersion ?? 0}
        busy={reviewBusy} generating={streaming || snapshot?.generationStatus === "running"}
        uncertain={confirmationUncertain} onClose={() => setReviewVisible(false)}
        onEdit={async (list, version, item) => {
          const error = await updateReviewItem(list, version, item);
          if (!error) markTouched(list.id);
          return error;
        }}
        onRemove={async (itemId) => {
          const listId = pendingList?.id;
          const error = await removeReviewItem(itemId);
          if (!error && listId) markTouched(listId);
          return error;
        }}
        onConfirm={confirmAll} onRefresh={refreshReviewList} />

      <View className="mx-4 mt-2 mb-2 flex-row items-center gap-1 rounded-[26px] bg-white pl-4 pr-1.5 py-1.5"
        style={{ shadowColor: "#444964", shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
        <TextInput
          className="flex-1 py-1.5 font-baloo text-base text-secondary"
          placeholder={isRecording ? t("chat.listening") : t("chat.inputPlaceholder")}
          placeholderTextColor={isRecording ? "#F56767" : "#A3A3A3"}
          value={input}
          onChangeText={setInput}
          editable={snapshot !== null && !isRecording}
          onSubmitEditing={() => void handleSend()}
          returnKeyType="send"
          maxLength={2000}
        />
        <Pressable
          className={`w-9 h-9 rounded-full items-center justify-center ${isRecording ? "bg-warning" : ""}`}
          disabled={!canSend || transcribing}
          onPressIn={() => startListening()}
          onPressOut={() => void stopAndUpload()}
          accessibilityLabel={t("chat.holdToTalk")}
        >
          {transcribing ? (
            <ActivityIndicator size="small" color="#8C8C8C" />
          ) : (
            <Ionicons name="mic" size={19} color={isRecording ? "#FFFFFF" : "#8C8C8C"} />
          )}
        </Pressable>
        <Pressable
          className={`w-9 h-9 rounded-full items-center justify-center ${
            canSend && input.trim().length > 0 ? "bg-highlight" : "bg-gray-200"
          }`}
          disabled={!canSend || input.trim().length === 0}
          onPress={() => void handleSend()}
        >
          <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
