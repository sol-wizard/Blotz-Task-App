import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  CellRendererProps,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  FlatList,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { router, useFocusEffect, useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import Toast from "react-native-toast-message";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import Animated, { Easing, FadeIn, FadeOut, Keyframe, useReducedMotion } from "react-native-reanimated";
import { useCoachVoiceInput } from "../hooks/useCoachVoiceInput";
import { useAiCoachChat, ConfirmAction, ChatItem } from "../hooks/useAiCoachChat";
import { AiCoachRating, ArtifactEnvelopeDto, EditedDraftDto, MessageFeedbackDto } from "../models/ai-coach-dto";
import { TaskDraftCard } from "./task-draft-card";
import { MessageFeedbackActions } from "./message-feedback-actions";
import { CoachMarkdown } from "./coach-markdown";
import { ReviewListBar } from "./review-list-bar";
import { FollowUpChips } from "./follow-up-chips";
import { ReviewListModal } from "./review-list-modal";
import { VoiceRecordingBar } from "./voice-recording-bar";
import { CoachComposer } from "./coach-composer";
import { CoachHeader } from "./coach-header";
import { CoachWelcome } from "./coach-welcome";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const fadeIn = FadeIn.duration(180).easing(EASE_OUT);
const fadeOut = FadeOut.duration(120);
const popIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.95 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE_OUT },
}).duration(150);
const popOut = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }] },
  100: { opacity: 0, transform: [{ scale: 0.95 }], easing: EASE_OUT },
}).duration(150);

function StreamingCursor() {
  const { t } = useTranslation("aiCoach");
  return <Animated.Text accessibilityLabel={t("chat.generating")} exiting={fadeOut} style={{
    animationName: { from: { opacity: 1 }, to: { opacity: 0.25 } },
    animationDuration: "500ms", animationIterationCount: "infinite", animationDirection: "alternate",
  }} className="font-baloo text-primary">▍</Animated.Text>;
}

function MessageBubble({ item, rateable, feedback, feedbackBusy, animateIn, onRate, onSaveDetail }: {
  item: ChatItem;
  animateIn: boolean;
  rateable: boolean;
  feedback: MessageFeedbackDto | undefined;
  feedbackBusy: boolean;
  onRate: (rating: AiCoachRating) => Promise<boolean>;
  onSaveDetail: (reason: string | null, detail: string | null) => Promise<boolean>;
}) {
  const { t } = useTranslation("aiCoach");
  if (item.role === "user") {
    return (
      <View className="my-1.5 max-w-[80%] self-end rounded-[20px] rounded-br-md px-4 py-2.5 bg-secondary">
        <Text className="font-baloo text-base text-white">{item.text}</Text>
      </View>
    );
  }
  // Assistant replies run the full width: the header already says who is talking.
  return (
    <View className="my-1.5 self-stretch">
      {item.taskContextRead && (
        <View className="flex-row items-center gap-1.5 mb-1">
          <Ionicons name="search" size={12} color="#6B7280" />
          <Text className="font-inter text-xs text-[#6B7280]">{t("chat.taskContextRead")}</Text>
        </View>
      )}
      <CoachMarkdown text={item.text} streaming={item.streaming} />
      {item.streaming && <StreamingCursor />}
      {!item.streaming && <Animated.View entering={animateIn ? fadeIn : undefined}>
        <MessageFeedbackActions text={item.text} rateable={rateable} feedback={feedback}
          busy={feedbackBusy} onRate={onRate} onSaveDetail={onSaveDetail} />
      </Animated.View>}
    </View>
  );
}

function TopicDivider() {
  const { t } = useTranslation("aiCoach");
  return (
    <View className="flex-row items-center gap-3 mt-3 mb-2">
      <View className="flex-1 h-px bg-gray-200" />
      <Text className="font-baloo text-xs text-[#6B7280]">{t("chat.topicStart")}</Text>
      <View className="flex-1 h-px bg-gray-200" />
    </View>
  );
}

/** Three pulsing dots while the first token is pending. */
function TypingIndicator({ label }: { label: string }) {
  return (
    <Animated.View entering={fadeIn} exiting={fadeOut} className="my-1.5 flex-row" accessibilityLabel={label}
      accessibilityLiveRegion="polite">
      <View className="flex-row items-center gap-1 rounded-[20px] rounded-tl-md bg-white px-4 py-3">
        {[0, 1, 2].map(index => (
          <Animated.View key={index} className="w-1.5 h-1.5 rounded-full bg-primary" style={{
            animationName: { from: { opacity: 0.3 }, to: { opacity: 1 } }, animationDuration: "320ms",
            animationDelay: `${index * 160}ms`, animationIterationCount: "infinite", animationDirection: "alternate",
          }} />
        ))}
      </View>
    </Animated.View>
  );
}

interface RowActions {
  rate: (messageId: string, rating: AiCoachRating) => Promise<boolean>;
  saveDetail: (messageId: string, reason: string | null, detail: string | null) => Promise<boolean>;
  confirm: (draftId: string, action: ConfirmAction, edited: EditedDraftDto, selectedItemIds: string[],
    allowScheduleConflict?: boolean, acceptedConflictToken?: string | null) => void;
  edit: (draftId: string, edited: EditedDraftDto) => Promise<string | null>;
  reject: (draftId: string) => void;
}

interface ChatRowProps {
  item: ChatItem;
  dateText: string | null;
  active: boolean;
  liveArtifacts: ArtifactEnvelopeDto[] | undefined;
  feedback: MessageFeedbackDto | undefined;
  feedbackBusy: boolean;
  cardsBusy: boolean;
  animateIn: boolean;
  actions: RowActions;
}

// The hook rebuilds message objects every render, so rows compare by content instead of identity.
const sameItem = (left: ChatItem, right: ChatItem) => left.id === right.id && left.text === right.text
  && left.streaming === right.streaming && left.topicStart === right.topicStart && left.createdAt === right.createdAt
  && left.conversationId === right.conversationId && left.taskContextRead === right.taskContextRead
  && left.draftSnapshot === right.draftSnapshot;

/** One timeline row; while a reply streams only its own row re-renders. */
const ChatRow = memo(function ChatRow({ item, dateText, active, liveArtifacts, feedback, feedbackBusy, cardsBusy,
  animateIn, actions }: ChatRowProps) {
  return <View>
    {dateText && <View className="self-center rounded-full bg-white px-3 py-0.5 my-3">
      <Text className="font-baloo text-xs text-[#6B7280]">{dateText}</Text>
    </View>}
    {item.topicStart && <TopicDivider />}
    <MessageBubble item={item} rateable={active} feedback={feedback} feedbackBusy={feedbackBusy} animateIn={animateIn}
      onRate={(rating) => actions.rate(item.id, rating)}
      onSaveDetail={(reason, detail) => actions.saveDetail(item.id, reason, detail)} />
    {item.draftSnapshot.map((historical) => {
      const live = active ? liveArtifacts?.find(card => card.id === historical.id) : undefined;
      const artifact = live ?? (!active && historical.status === "pending" ? { ...historical, status: "expired" as const } : historical);
      if (artifact.isReviewList) return null;
      return <Animated.View key={artifact.id} entering={animateIn ? fadeIn : undefined}>
        <TaskDraftCard artifact={artifact} readOnly={!live} busy={cardsBusy}
          onConfirm={(action, edited, selectedIds, allowConflict, token) =>
            actions.confirm(artifact.id, action, edited, selectedIds, allowConflict, token)}
          onEdit={(edited) => actions.edit(artifact.id, edited)}
          onReject={() => actions.reject(artifact.id)} />
      </Animated.View>;
    })}
  </View>;
}, (previous, next) => sameItem(previous.item, next.item) && previous.dateText === next.dateText
  && previous.active === next.active && previous.liveArtifacts === next.liveArtifacts
  && previous.feedback === next.feedback && previous.feedbackBusy === next.feedbackBusy
  && previous.cardsBusy === next.cardsBusy && previous.animateIn === next.animateIn && previous.actions === next.actions);

/** Chronological timeline; growing replies leave the reading position in place. */
export function ExecutionChatPanel() {
  const { t, i18n } = useTranslation("aiCoach");
  const { snapshot, messages, keyFor, status, start, send, confirm, edit, reject,
    feedbackByMessage, feedbackSaving, rateMessage, saveFeedbackDetail,
    pendingList, pendingCount, reviewBusy, confirmationUncertain, streaming, reconnecting,
    updateReviewItem, removeReviewItem, confirmAll, refreshReviewList,
    newTopic, clearChat, loadOlder, loadingOlder, historyLoading, historyError, retryHistory } = useAiCoachChat();
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
  const [calendarNow, setCalendarNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setCalendarNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const scrollRef = useRef<FlatList<ChatItem>>(null);
  const initialScrollPending = useRef(true);
  const chronologicalMessages = useMemo(() => [...messages].reverse(), [messages]);
  const timelineRef = useRef(chronologicalMessages);
  useLayoutEffect(() => { timelineRef.current = chronologicalMessages; }, [chronologicalMessages]);
  const cellLayouts = useRef(new Map<string, { y: number; height: number }>());
  const questionIdRef = useRef<string | null>(null);
  const questionToPosition = useRef(false);
  const previousQuestion = useRef<{ id: string | undefined } | null>(null);
  const contentHeight = useRef(0);
  const scrollMetrics = useRef({ offset: 0, viewport: 0, spacer: 0 });
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  // Sending closes the keyboard; the question only glides up once the viewport stops resizing.
  const [keyboardSettling, setKeyboardSettling] = useState(false);
  const keyboardWait = useRef<{ remove: () => void } | null>(null);
  useEffect(() => () => keyboardWait.current?.remove(), []);
  const reducedMotion = useReducedMotion();
  const updateScrollToLatest = useCallback(() => {
    const { offset, viewport, spacer } = scrollMetrics.current;
    const distance = contentHeight.current - spacer - viewport - offset;
    setShowScrollToLatest(visible => {
      if (initialScrollPending.current || questionToPosition.current || viewport <= 0) return false;
      return visible ? distance > 40 : distance > 80;
    });
  }, []);
  const scrollToLatest = () => {
    initialScrollPending.current = false;
    questionToPosition.current = false;
    previousQuestion.current = null;
    const { viewport, spacer } = scrollMetrics.current;
    scrollRef.current?.scrollToOffset({
      offset: Math.max(0, contentHeight.current - spacer - viewport),
      animated: !reducedMotion,
    });
  };
  const [viewportHeight, setViewportHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const [questionLayout, setQuestionLayout] = useState<{ y: number | null; turnHeight: number } | null>(null);
  const updateQuestionLayout = useCallback(() => {
    const id = questionIdRef.current;
    if (!id) return;
    const timeline = timelineRef.current;
    const index = timeline.findIndex(item => item.id === id);
    const question = cellLayouts.current.get(id);
    if (index < 0 || !question) return;
    const turnHeight = timeline.slice(index).reduce((height, item) => height + (cellLayouts.current.get(item.id)?.height ?? 0), 0);
    setQuestionLayout(previous => previous?.y === question.y && previous.turnHeight === turnHeight
      ? previous : { y: question.y, turnHeight });
  }, []);
  // Keep cell measurements in list coordinates, including virtualized history above the question.
  const QuestionCell = useCallback(({ item, onLayout, children, style, onFocusCapture }: CellRendererProps<ChatItem>) => (
    <View {...{ style, onFocusCapture }} onLayout={event => {
      onLayout?.(event);
      const { y, height } = event.nativeEvent.layout;
      cellLayouts.current.set(item.id, { y, height });
      updateQuestionLayout();
    }}>{children}</View>
  ), [updateQuestionLayout]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const waiting = previousQuestion.current;
      if (waiting) {
        const latest = [...chronologicalMessages].reverse().find(item => item.role === "user");
        if (latest && latest.id !== waiting.id) {
          previousQuestion.current = null;
          questionIdRef.current = latest.id;
          questionToPosition.current = true;
          setQuestionLayout({ y: null, turnHeight: 0 });
          // Bring an unmounted new question into the render window before measuring it.
          const { offset, viewport, spacer } = scrollMetrics.current;
          const farFromEnd = contentHeight.current - spacer - viewport - offset > viewport * 5;
          if (!cellLayouts.current.has(latest.id) && farFromEnd) scrollRef.current?.scrollToEnd({ animated: false });
        }
      }
      if (questionIdRef.current && !chronologicalMessages.some(item => item.id === questionIdRef.current)) {
        questionIdRef.current = null;
        questionToPosition.current = false;
        setQuestionLayout(null);
      } else updateQuestionLayout();
    });
    return () => cancelAnimationFrame(frame);
  }, [chronologicalMessages, updateQuestionLayout]);
  const prepareQuestionPosition = () => {
    initialScrollPending.current = false;
    previousQuestion.current = { id: [...chronologicalMessages].reverse().find(item => item.role === "user")?.id };
    if (Keyboard.isVisible()) {
      keyboardWait.current?.remove();
      setKeyboardSettling(true);
      const subscription = Keyboard.addListener("keyboardDidHide", () => settle());
      // Some Android keyboards never report hiding; don't hold the question back for long.
      const fallback = setTimeout(() => settle(), 600);
      const settle = () => {
        subscription.remove();
        clearTimeout(fallback);
        keyboardWait.current = null;
        setKeyboardSettling(false);
      };
      keyboardWait.current = { remove: settle };
    }
    Keyboard.dismiss();
  };
  // Shrink only the spare space as the reply grows, keeping the question's offset reachable.
  const replySpace = questionLayout
    ? Math.max(0, viewportHeight - questionLayout.turnHeight - footerHeight - 12) : 0;
  const positionQuestion = useCallback(() => {
    if (!questionToPosition.current || keyboardSettling || questionLayout?.y == null || viewportHeight <= 0
      || contentHeight.current < questionLayout.y + viewportHeight - 1) return;
    questionToPosition.current = false;
    scrollRef.current?.scrollToOffset({ offset: questionLayout.y, animated: !reducedMotion });
  }, [questionLayout, viewportHeight, keyboardSettling, reducedMotion]);
  useEffect(() => { positionQuestion(); }, [positionQuestion]);
  useEffect(() => {
    if (status !== "connecting") return;
    initialScrollPending.current = true;
    questionIdRef.current = null;
    questionToPosition.current = false;
    previousQuestion.current = null;
    const frame = requestAnimationFrame(() => setQuestionLayout(null));
    return () => cancelAnimationFrame(frame);
  }, [status]);

  const chatReady = status === "ready" && !confirmationUncertain && snapshot?.allowedActions.includes("send_message") === true;

  // A finished take is sent straight away, along with anything already typed.
  const sendVoiceTranscript = async (text: string) => {
    if (!text.trim()) {
      Toast.show({ type: "info", text1: t("chat.emptyAudio") });
      return;
    }
    const combined = [input.trim(), text].filter(Boolean).join(" ");
    if (!chatReady) {
      setInput(combined);
      Toast.show({ type: "info", text1: t("chat.voiceSendLater") });
      return;
    }
    prepareQuestionPosition();
    setInput("");
    if (await send(combined)) {
      setInput(current => current.trim() ? current : combined);
      Toast.show({ type: "error", text1: t("chat.sendError") });
    }
  };
  const voice = useCoachVoiceInput(snapshot?.conversationId, (text) => void sendVoiceTranscript(text));
  const voiceBusy = voice.busy;

  const generating = status === "sending" || snapshot?.generationStatus === "running";
  const showWelcome = status === "ready" && messages.length === 0 && !historyLoading && !historyError;
  const canSend = !voiceBusy && chatReady;

  const handleSend = async () => {
    if (!canSend || !input.trim()) return;
    const text = input;
    prepareQuestionPosition();
    setInput("");
    const errorCode = await send(text);
    if (errorCode) {
      setInput(current => current.trim() ? current : text);
      Toast.show({ type: "error", text1: t("chat.sendError") });
    }
  };

  const handleStarter = async (text: string) => {
    if (!canSend) return;
    prepareQuestionPosition();
    if (await send(text)) Toast.show({ type: "error", text1: t("chat.sendError") });
  };

  // A tapped follow-up leaves any draft in the input untouched.
  const handleFollowUp = async (text: string) => {
    if (!canSend) return;
    prepareQuestionPosition();
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

  // Rows get one stable action object, so a streaming update doesn't re-render every visible row.
  const latestRowActions = useRef<RowActions | null>(null);
  useEffect(() => {
    latestRowActions.current = {
      rate: rateMessage,
      saveDetail: saveFeedbackDetail,
      confirm: (...args) => void handleConfirm(...args),
      edit,
      reject: (draftId) => void reject(draftId).then(error => {
        if (error) Toast.show({ type: "error", text1: t("draft.editFailed") });
      }),
    };
  });
  const rowActions = useMemo<RowActions>(() => ({
    rate: (...args) => latestRowActions.current?.rate(...args) ?? Promise.resolve(false),
    saveDetail: (...args) => latestRowActions.current?.saveDetail(...args) ?? Promise.resolve(false),
    confirm: (...args) => latestRowActions.current?.confirm(...args),
    edit: (...args) => latestRowActions.current?.edit(...args) ?? Promise.resolve("NotReady"),
    reject: (draftId) => latestRowActions.current?.reject(draftId),
  }), []);

  const blockedBanner = () => {
    if (snapshot?.generationStatus !== "failed") return null;
    if (snapshot.generationError === "quota") {
      return (
        <View className="bg-white rounded-3xl p-4 my-2">
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
      <View className="bg-[#FFF7ED] rounded-2xl px-3 py-2.5 my-2">
        <Text className="font-baloo text-sm text-[#C2410C]">{t(key)}</Text>
      </View>
    );
  };

  const runMenuAction = async (action: () => Promise<string | null>, successText?: string) => {
    if (voiceBusy) {
      Toast.show({ type: "info", text1: t("chat.busy") });
      return;
    }
    const error = await action();
    if (error) Toast.show({ type: "error", text1: t(error === "ConversationBusy" ? "chat.busy" : "chat.actionFailed") });
    else {
      if (successText) Toast.show({ type: "success", text1: successText });
      scrollRef.current?.scrollToEnd({ animated: false });
    }
  };
  const startNewTopic = () => {
    if (!pendingCount) { void runMenuAction(newTopic, t("chat.newTopicStarted")); return; }
    Alert.alert(t("review.newTopicTitle"), t("review.newTopicDescription", { count: pendingCount }), [
      { text: t("review.keepReviewing"), style: "cancel", onPress: () => setReviewVisible(true) },
      { text: t("chat.newTopic"), style: "destructive", onPress: () => void runMenuAction(newTopic, t("chat.newTopicStarted")) },
    ]);
  };
  const openMenu = () => Alert.alert(t("chat.menu"), undefined, [
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
      <CoachHeader
        status={voiceBusy ? "listening" : generating ? "thinking" : "idle"}
        actionsDisabled={confirmationUncertain || status !== "ready" || generating
          || snapshot?.artifacts.some(card => card.status === "processing") === true}
        onBack={() => router.back()} onNewTopic={startNewTopic} onMenu={openMenu} />
      <View className="flex-1 relative">
        <FlatList
          ref={scrollRef}
          data={chronologicalMessages}
          CellRendererComponent={QuestionCell}
          keyExtractor={keyFor}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 12 }}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          keyboardShouldPersistTaps="handled"
          onStartReached={() => { if (!initialScrollPending.current) loadOlder(); }}
          onStartReachedThreshold={0.3}
          onLayout={event => {
            const height = event.nativeEvent.layout.height;
            setViewportHeight(height);
            scrollMetrics.current.viewport = height;
            updateScrollToLatest();
          }}
          onScroll={event => {
            scrollMetrics.current.offset = event.nativeEvent.contentOffset.y;
            updateScrollToLatest();
          }}
          scrollEventThrottle={32}
          onScrollBeginDrag={() => {
            initialScrollPending.current = false;
            questionToPosition.current = false;
            previousQuestion.current = null;
          }}
          onContentSizeChange={(_width, height) => {
            contentHeight.current = height;
            updateScrollToLatest();
            if (questionToPosition.current) {
              positionQuestion();
              return;
            }
            if (!initialScrollPending.current || status !== "ready" || messages.length === 0) return;
            // Rows render in batches and re-measure late, so stay pinned to the end until the user scrolls or sends.
            // scrollToEnd reads row metrics that aren't measured yet here; the reported height is already real.
            const { viewport, spacer } = scrollMetrics.current;
            scrollRef.current?.scrollToOffset({ offset: Math.max(0, height - spacer - viewport), animated: false });
          }}
          ListHeaderComponent={<View>
            {loadingOlder && <ActivityIndicator />}
            {historyError && <Pressable onPress={retryHistory}><Text className="font-baloo text-primary text-center py-3">{t("chat.historyError")}</Text></Pressable>}
          </View>}
          ListFooterComponent={<View>
            <View onLayout={event => setFooterHeight(event.nativeEvent.layout.height)}>
              {/* An empty new topic still marks where it starts; its first message takes the divider over. */}
              {status === "ready" && snapshot?.messages.length === 0 && messages.length > 0 && <TopicDivider />}
              {status === "connecting" && <ActivityIndicator />}
              {status === "startFailed" && <Pressable onPress={() => void start()}>
                <Text className="font-baloo text-warning p-3">{t("chat.startError")}</Text>
              </Pressable>}
              {reconnecting ? <Text className="font-baloo text-primary p-3">{t("chat.reconnecting")}</Text>
                : generating && !messages.some(item => item.streaming) && <TypingIndicator label={t("chat.thinking")} />}
              {!generating && !!snapshot?.followUps?.length && <Animated.View entering={fadeIn}>
                <FollowUpChips items={snapshot.followUps} disabled={!canSend} onSend={(text) => void handleFollowUp(text)} />
              </Animated.View>}
              {blockedBanner()}
            </View>
            <View style={{ height: replySpace }} onLayout={event => {
              scrollMetrics.current.spacer = event.nativeEvent.layout.height;
              updateScrollToLatest();
            }} />
          </View>}
          renderItem={({ item, index }) => {
            const older = chronologicalMessages[index - 1];
            const active = item.conversationId === snapshot?.conversationId;
            return <ChatRow item={item} active={active} liveArtifacts={active ? snapshot?.artifacts : undefined}
              dateText={!older || dayKey(older.createdAt) !== dayKey(item.createdAt) ? dateLabel(item.createdAt) : null}
              feedback={feedbackByMessage[item.id]} feedbackBusy={feedbackSaving[item.id] === true}
              cardsBusy={generating} animateIn={keyFor(item) !== item.id} actions={rowActions} />;
          }}
        />
        {/* Outside the list: after a clear, the list keeps its old offset and would hide a header welcome. */}
        {showWelcome && <Animated.View exiting={FadeOut.duration(200)} className="absolute inset-0 bg-background">
          <ScrollView className="flex-1" contentContainerClassName="px-4" keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
            <CoachWelcome disabled={!canSend} onStart={(text) => void handleStarter(text)} />
          </ScrollView>
        </Animated.View>}
        {showScrollToLatest && status !== "connecting" && <Animated.View entering={popIn} exiting={popOut}
          className="absolute right-4 bottom-3">
          <Pressable
            onPress={scrollToLatest}
            accessibilityRole="button"
            accessibilityLabel={t("chat.scrollToLatest")}
            hitSlop={4}
            className="w-10 h-10 rounded-full bg-white items-center justify-center"
            style={{ boxShadow: "0 2px 8px rgba(68, 73, 100, 0.16)" }}
          >
            <Ionicons name="arrow-down" size={21} color="#444964" />
          </Pressable>
        </Animated.View>}
      </View>

      {/* TEMPORARY debug line (2026-08-24): session token usage — remove with snapshot.debugUsage. */}
      {__DEV__ && snapshot?.debugUsage && (
        <Text className="font-baloo text-[11px] text-primary text-center pb-0.5 opacity-60">
          {`${snapshot.debugUsage.totalTokens.toLocaleString()} tokens (in ${snapshot.debugUsage.inputTokens.toLocaleString()} / out ${snapshot.debugUsage.outputTokens.toLocaleString()})${
            snapshot.debugUsage.estUsd != null ? ` · $${snapshot.debugUsage.estUsd.toFixed(4)}` : ""
          }`}
        </Text>
      )}

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

      <View className="mx-3 mt-2 mb-2">
        {voiceBusy ? (
          <VoiceRecordingBar sending={voice.phase === "sending"} elapsedMs={voice.elapsedMs}
            onCancel={() => void voice.cancel()} onSend={() => void voice.stopAndSend()} />
        ) : (
          <CoachComposer value={input} onChangeText={setInput} editable={snapshot !== null} canSend={canSend}
            onSend={() => void handleSend()} onStartVoice={voice.start} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
