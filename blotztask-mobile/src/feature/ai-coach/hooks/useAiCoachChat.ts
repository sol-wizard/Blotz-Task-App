import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AxiosError } from "axios";
import { InfiniteData, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useReducedMotion } from "react-native-reanimated";
import uuid from "react-native-uuid";
import { ddlKeys, noteKeys, taskKeys } from "@/shared/constants/query-key-factory";
import {
  ArtifactEnvelopeDto,
  ChatTimelinePageDto,
  ConfirmDraftResultDto,
  ConversationConflictDto,
  ConversationSnapshotDto,
  DraftScheduleAssessmentDto,
  EditedDraftDto,
  AiCoachRating,
  MessageFeedbackDto,
  EditedDraftItemDto,
  EditedNoteDraftItemDto,
  TaskDraftItemDto,
} from "../models/ai-coach-dto";
import { reviewedItems } from "../models/review-list";
import * as aiCoachService from "../services/ai-coach-service";
import { MessageSource, streamCoachMessage } from "../services/coach-stream-service";

export interface ChatItem {
  id: string;
  role: "user" | "assistant";
  text: string;
  taskContextRead?: boolean;
  conversationId: string;
  createdAt: string;
  topicStart: boolean;
  draftSnapshot: ArtifactEnvelopeDto[];
  streaming?: boolean;
}
export type ChatStatus = "idle" | "connecting" | "ready" | "sending" | "startFailed";
export type ConfirmAction = "add_to_task_list";
export interface ConfirmOutcome {
  result: ConfirmDraftResultDto | null;
  errorCode: string | null;
  scheduleAssessment?: DraftScheduleAssessmentDto | null;
}

/** A review list with the reply whose stored copy holds it; cards without their own reply sit under that reply. */
export interface ReviewListSource {
  list: ArtifactEnvelopeDto;
  containerMessageId: string | null;
  /** The open topic's list from the snapshot; stored copies on replies are history and never tappable. */
  live: boolean;
}
export interface TickOutcome {
  added: boolean;
  /** Titles of existing tasks that a newly saved task overlaps. */
  conflicts: string[];
  errorCode: string | null;
}

export const isItemSaved = (item: TaskDraftItemDto) => item.persistedTaskId != null || item.persistedNoteId != null;

export const chatMessagesKey = ["aiCoach", "chat", "messages"] as const;

const REVEAL_TICK_MS = 33;
const FINISH_REVEAL_MS = 300;

/** Reveals a steady trickle, catching up faster as the backlog grows; never splits a surrogate pair. */
function nextRevealLength(text: string, shown: number, finishing: boolean): number {
  const backlog = text.length - shown;
  let next = Math.min(text.length, shown + Math.max(2, Math.ceil(backlog / (finishing ? 3 : 8))));
  const code = text.charCodeAt(next - 1);
  if (code >= 0xd800 && code <= 0xdbff && next < text.length) next += 1;
  return next;
}

export function useAiCoachChat() {
  const queryClient = useQueryClient();
  const [snapshot, setSnapshot] = useState<ConversationSnapshotDto | null>(null);
  const [status, setStatus] = useState<ChatStatus>("connecting");
  const [pendingMessage, setPendingMessage] = useState<ChatItem | null>(null);
  const [streamingReply, setStreamingReply] = useState<ChatItem | null>(null);
  // A saved reply keeps its streamed row's key, so the list cell is updated rather than remounted.
  const [rowKeys, setRowKeys] = useState<Record<string, string>>({});
  const reducedMotion = useReducedMotion();
  const reducedMotionRef = useRef(reducedMotion);
  useEffect(() => { reducedMotionRef.current = reducedMotion; }, [reducedMotion]);
  const [streaming, setStreaming] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const streamController = useRef<AbortController | null>(null);
  const [feedbackByMessage, setFeedbackByMessage] = useState<Record<string, MessageFeedbackDto>>({});
  const [feedbackSaving, setFeedbackSaving] = useState<Record<string, boolean>>({});
  const feedbackPending = useRef(new Set<string>());
  const busy = useRef(false);
  const lifecycle = useRef(0);
  useEffect(() => () => {
    lifecycle.current += 1;
    streamController.current?.abort();
  }, []);
  const snapshotRef = useRef<ConversationSnapshotDto | null>(null);
  // The circle the user wants per item while its requests run; once they settle, the saved IDs decide.
  const [wantedAdded, setWantedAdded] = useState<Record<string, boolean>>({});
  const wantedRef = useRef<Record<string, boolean>>({});
  const ticking = useRef(new Set<string>());
  const [tickBusy, setTickBusy] = useState(false);
  const invalidateSavedItems = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.all });
    void queryClient.invalidateQueries({ queryKey: ddlKeys.all });
    void queryClient.invalidateQueries({ queryKey: noteKeys.all });
  }, [queryClient]);
  const history = useInfiniteQuery({
    queryKey: chatMessagesKey,
    queryFn: ({ pageParam, signal }) => aiCoachService.fetchMessages(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: snapshot !== null,
  });
  const refreshHistory = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: chatMessagesKey });
  }, [queryClient]);
  const applySnapshot = useCallback((next: ConversationSnapshotDto) => {
    const previous = snapshotRef.current;
    if (previous?.conversationId === next.conversationId && previous.conversationVersion > next.conversationVersion) return;
    snapshotRef.current = next;
    setSnapshot(next);
    if (next.generationStatus !== "running") setReconnecting(false);
  }, []);

  const applyOpenSnapshot = useCallback(async (next: ConversationSnapshotDto, isCurrent: () => boolean) => {
    if (!isCurrent()) return;
    await queryClient.cancelQueries({ queryKey: chatMessagesKey, exact: true });
    if (!isCurrent()) return;
    // An old cursor chain cannot bridge remote inserts or identify a remote clear. Restart from page one.
    queryClient.setQueryData<InfiniteData<ChatTimelinePageDto, string | null>>(chatMessagesKey,
      { pages: [], pageParams: [] });
    applySnapshot(next);
    refreshHistory();
  }, [applySnapshot, queryClient, refreshHistory]);

  const start = useCallback(async () => {
    if (busy.current) return;
    const epoch = ++lifecycle.current;
    setStatus("connecting");
    try {
      const next = await aiCoachService.openChat();
      await applyOpenSnapshot(next, () => epoch === lifecycle.current);
      if (epoch === lifecycle.current) setStatus("ready");
    } catch {
      if (epoch === lifecycle.current) setStatus("startFailed");
    }
  }, [applyOpenSnapshot]);

  useFocusEffect(useCallback(() => {
    if (busy.current) return;
    const epoch = ++lifecycle.current;
    let cancelled = false;
    setStatus("connecting");
    const isCurrent = () => !cancelled && epoch === lifecycle.current;
    void (async () => {
      try {
        const next = await aiCoachService.openChat();
        await applyOpenSnapshot(next, isCurrent);
        if (isCurrent()) setStatus("ready");
      } catch {
        if (isCurrent()) setStatus("startFailed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyOpenSnapshot]));

  const resync = useCallback(
    async (error: unknown): Promise<string> => {
      const body = (error as AxiosError<ConversationConflictDto>).response?.data;
      if (body?.errorCode !== "ConversationEnded" && body?.conversationSnapshot) applySnapshot(body.conversationSnapshot);
      else {
        // The open topic may have changed server-side (idle rollover after a timed-out send, 404, ended).
        try {
          const next = await aiCoachService.openChat();
          await applyOpenSnapshot(next, () => true);
        } catch {
          /* Keep visible data when the network is offline. */
        }
      }
      return body?.errorCode ?? "RequestFailed";
    },
    [applySnapshot, applyOpenSnapshot],
  );

  // Reconcile a request that continued on the server after an HTTP timeout.
  const serverBusy =
    snapshot?.generationStatus === "running" ||
    snapshot?.artifacts.some((draft) => draft.status === "processing");
  const conversationId = snapshot?.conversationId;
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    void aiCoachService.getMessageFeedback(conversationId).then(
      (items) => {
        if (!cancelled) setFeedbackByMessage(Object.fromEntries(items.map((item) => [item.assistantMessageId, item])));
      },
      () => undefined,
    );
    return () => { cancelled = true; };
  }, [conversationId]);
  useEffect(() => {
    if (streaming || !serverBusy || !conversationId) return;
    const id = conversationId;
    let cancelled = false;
    const timer = setInterval(() => {
      void aiCoachService
        .fetchSnapshot(id)
        .then((next) => {
          if (!cancelled && snapshotRef.current?.conversationId === id) applySnapshot(next);
        })
        .catch(async (error: unknown) => {
          const code = (error as AxiosError<ConversationConflictDto>).response?.data?.errorCode;
          if (!cancelled && (code === "ConversationEnded" || (error as AxiosError).response?.status === 404)) {
            try {
              const next = await aiCoachService.openChat();
              await applyOpenSnapshot(next, () => !cancelled && snapshotRef.current?.conversationId === id);
            } catch { /* Retry on the next poll. */ }
          }
        });
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [serverBusy, conversationId, applySnapshot, applyOpenSnapshot, streaming]);

  const send = useCallback(
    async (text: string, source?: MessageSource): Promise<string | null> => {
      // A tick changes the conversation version, so a message waits until every tick has settled.
      if (!snapshot || busy.current || ticking.current.size > 0 || snapshot.generationStatus === "running") return "NotReady";
      const content = text.trim();
      if (!content) return null;
      busy.current = true;
      const epoch = ++lifecycle.current;
      setStatus("sending");
      setStreaming(true);
      setReconnecting(false);
      setStreamingReply(null);
      const controller = new AbortController();
      streamController.current = controller;
      const messageId = uuid.v4() as string;
      const streamKey = `stream-${messageId}`;
      const createdAt = new Date().toISOString();
      setPendingMessage({ id: messageId, role: "user", text: content, conversationId: snapshot.conversationId,
        createdAt, topicStart: snapshot.messages.length === 0, draftSnapshot: [] });
      let replyText = "";
      let shown = 0;
      let finishing = false;
      let streamed = false;
      let activeConversationId = snapshot.conversationId;
      let revealTimer: ReturnType<typeof setInterval> | undefined;
      let drained: (() => void) | undefined;
      const stopReveal = () => {
        clearInterval(revealTimer);
        revealTimer = undefined;
        drained?.();
        drained = undefined;
      };
      const reveal = () => {
        if (epoch !== lifecycle.current) { stopReveal(); return; }
        shown = reducedMotionRef.current ? replyText.length : nextRevealLength(replyText, shown, finishing);
        // An empty reset round keeps the previous bubble until its first delta, instead of flashing away.
        if (shown > 0) streamed = true;
        if (shown > 0) setStreamingReply({ id: streamKey, role: "assistant", text: replyText.slice(0, shown),
          conversationId: activeConversationId, createdAt: new Date(Date.parse(createdAt) + 1).toISOString(),
          topicStart: false, draftSnapshot: [], streaming: true });
        if (shown >= replyText.length) stopReveal();
      };
      const startReveal = () => {
        revealTimer ??= setInterval(reveal, reducedMotionRef.current ? 75 : REVEAL_TICK_MS);
      };
      // Plays out text already received before the saved reply replaces it, within a short cap.
      const finishReveal = () => new Promise<void>(resolve => {
        if (!revealTimer || reducedMotionRef.current) { stopReveal(); resolve(); return; }
        finishing = true;
        const cap = setTimeout(() => { shown = replyText.length; reveal(); }, FINISH_REVEAL_MS);
        drained = () => { clearTimeout(cap); resolve(); };
      });
      // Until a snapshot proves otherwise, a lost response may still represent accepted work.
      applySnapshot({ ...snapshot, generationStatus: "running", generationError: null, allowedActions: [] });
      try {
        const next = await streamCoachMessage(
          snapshot.conversationId,
          content,
          snapshot.conversationVersion,
          messageId,
          (event) => {
            if (epoch !== lifecycle.current) return;
            activeConversationId = event.conversationId;
            switch (event.type) {
              case "turn.started":
                setPendingMessage(previous => previous ? { ...previous, conversationId: activeConversationId } : null);
                break;
              case "reply.delta":
                replyText += event.payload.text;
                startReveal();
                break;
              case "reply.reset":
                replyText = "";
                shown = 0;
                stopReveal();
                break;
            }
          },
          controller.signal,
          source,
        );
        if (epoch !== lifecycle.current) return null;
        await finishReveal();
        if (epoch !== lifecycle.current) return null;
        const userIndex = next.messages.findIndex(message => message.id === messageId);
        const savedReply = userIndex < 0 ? undefined
          : next.messages.slice(userIndex + 1).find(message => message.role === "assistant");
        if (savedReply && streamed) setRowKeys(previous => ({ ...previous, [savedReply.id]: streamKey }));
        applySnapshot(next);
        refreshHistory();
        return next.generationError;
      } catch (error) {
        if (epoch !== lifecycle.current) return null;
        setReconnecting(true);
        const code = await resync(error);
        const recovered = snapshotRef.current;
        const userIndex = recovered?.messages.findIndex(message => message.id === messageId) ?? -1;
        // The server keeps generating after a lost stream; polling delivers the saved reply.
        if (recovered?.generationStatus === "running" && userIndex >= 0) return null;
        if (recovered?.generationStatus === "idle" && userIndex >= 0
          && recovered.messages.slice(userIndex + 1).some(message => message.role === "assistant")) {
          refreshHistory();
          return null;
        }
        return code;
      } finally {
        stopReveal();
        if (streamController.current === controller) streamController.current = null;
        busy.current = false;
        if (epoch === lifecycle.current) {
          setPendingMessage(null);
          setStreamingReply(null);
          setStreaming(false);
          setStatus("ready");
        }
      }
    },
    [snapshot, applySnapshot, resync, refreshHistory],
  );

  const confirm = useCallback(
    async (
      draftId: string,
      action: ConfirmAction,
      edited: EditedDraftDto,
      selectedItemIds: string[],
      allowScheduleConflict = false,
      acceptedConflictToken?: string | null,
    ): Promise<ConfirmOutcome> => {
      const draft = snapshot?.artifacts.find((item) => item.id === draftId);
      if (!snapshot || !draft || busy.current) return { result: null, errorCode: "NotReady" };
      busy.current = true;
      lifecycle.current += 1;
      setStatus("sending");
      try {
        const result = await aiCoachService.confirmDraft(snapshot.conversationId, draftId, {
          commandId: uuid.v4() as string,
          expectedConversationVersion: snapshot.conversationVersion,
          expectedDraftVersion: draft.version,
          action,
          editedDraft: edited,
          selectedItemIds,
          allowScheduleConflict,
          acceptedConflictToken,
        });
        applySnapshot(result.conversationSnapshot);
        refreshHistory();
        if (result.status === "succeeded") {
          // Confirmed drafts create tasks server-side; refresh task list, calendars, and DDL.
          void queryClient.invalidateQueries({ queryKey: taskKeys.all });
          void queryClient.invalidateQueries({ queryKey: ddlKeys.all });
          void queryClient.invalidateQueries({ queryKey: noteKeys.all });
        }
        return { result, errorCode: result.errorCode };
      } catch (error) {
        const body = (error as AxiosError<ConfirmDraftResultDto | ConversationConflictDto>).response?.data;
        const errorCode = await resync(error);
        return {
          result: body && "status" in body ? body : null,
          errorCode,
          scheduleAssessment: body && "scheduleAssessment" in body ? body.scheduleAssessment : null,
        };
      } finally {
        busy.current = false;
        setStatus("ready");
      }
    },
    [snapshot, applySnapshot, resync, queryClient, refreshHistory],
  );

  const edit = useCallback(
    async (draftId: string, edited: EditedDraftDto): Promise<string | null> => {
      const draft = snapshot?.artifacts.find((item) => item.id === draftId);
      if (!snapshot || !draft || busy.current || ticking.current.size > 0) return "NotReady";
      busy.current = true;
      lifecycle.current += 1;
      setStatus("sending");
      try {
        applySnapshot(
          await aiCoachService.editDraft(snapshot.conversationId, draftId, {
            expectedConversationVersion: snapshot.conversationVersion,
            expectedDraftVersion: draft.version,
            editedDraft: edited,
          }),
        );
        refreshHistory();
        return null;
      } catch (error) {
        return await resync(error);
      } finally {
        busy.current = false;
        setStatus("ready");
      }
    },
    [snapshot, applySnapshot, resync, refreshHistory],
  );

  const reject = useCallback(
    async (draftId: string): Promise<string | null> => {
      if (!snapshot || busy.current || ticking.current.size > 0) return "NotReady";
      busy.current = true;
      lifecycle.current += 1;
      setStatus("sending");
      try {
        applySnapshot(
          await aiCoachService.rejectDraft(
            snapshot.conversationId,
            draftId,
            uuid.v4() as string,
            snapshot.conversationVersion,
          ),
        );
        refreshHistory();
        return null;
      } catch (error) {
        return await resync(error);
      } finally {
        busy.current = false;
        setStatus("ready");
      }
    },
    [snapshot, applySnapshot, resync, refreshHistory],
  );

  const setWanted = useCallback((itemId: string, added: boolean | undefined) => {
    const next = { ...wantedRef.current };
    if (added === undefined) delete next[itemId];
    else next[itemId] = added;
    wantedRef.current = next;
    setWantedAdded(next);
  }, []);

  /**
   * Tick or untick one card. Its circle flips at once; one request per item runs at a time, and taps made
   * meanwhile only change the wanted state, which one last request sends. Resolves with the final result for
   * the tap that started the requests, and with null for taps made while they run.
   */
  const tickItem = useCallback(async (draftId: string, itemId: string, added: boolean): Promise<TickOutcome | null> => {
    // An edit, topic change or task-card save is running; its version check would fail if a tick slipped in.
    if (busy.current) return { added, conflicts: [], errorCode: "ConversationBusy" };
    setWanted(itemId, added);
    if (ticking.current.has(itemId)) return null;
    ticking.current.add(itemId);
    setTickBusy(true);
    let outcome: TickOutcome | null = null;
    try {
      for (;;) {
        const current = snapshotRef.current;
        const item = current?.artifacts.find(list => list.id === draftId)?.payload.items
          .find(value => value.itemId === itemId);
        const wanted = wantedRef.current[itemId];
        if (wanted === undefined) break;
        if (!current || !item) {
          // The coach or another device changed the list before this tap was sent.
          outcome ??= { added: wanted, conflicts: [], errorCode: "DraftItemNotFound" };
          break;
        }
        if (wanted === isItemSaved(item)) break;
        try {
          const result = await aiCoachService.setDraftItemAdded(current.conversationId, draftId, itemId, wanted);
          applySnapshot(result.conversationSnapshot);
          invalidateSavedItems();
          outcome = { added: wanted, conflicts: [...new Set(result.conflicts.map(entry => entry.taskTitle))], errorCode: null };
        } catch (error) {
          const response = (error as AxiosError<ConversationConflictDto>).response;
          // A refused tick (422) changed nothing on the server, so the visible chat needs no reload.
          const errorCode = response?.status === 422 ? response.data?.errorCode ?? "RequestFailed" : await resync(error);
          outcome = { added: wanted, conflicts: [], errorCode };
          break;
        }
      }
    } finally {
      ticking.current.delete(itemId);
      setWanted(itemId, undefined);
      setTickBusy(ticking.current.size > 0);
    }
    return outcome;
  }, [applySnapshot, invalidateSavedItems, resync, setWanted]);

  // Every review list the timeline knows, newest copy first: the open topic's live list, then the copies
  // stored on replies (older topics included), so each card can be placed under its reply.
  const reviewLists = useMemo(() => {
    const byId = new Map<string, ReviewListSource>();
    const consider = (list: ArtifactEnvelopeDto, containerMessageId: string | null, live: boolean) => {
      if (!list.isReviewList) return;
      const known = byId.get(list.id);
      if (!known) byId.set(list.id, { list, containerMessageId, live });
      else byId.set(list.id, {
        list: known.live || known.list.version >= list.version ? known.list : list,
        containerMessageId: known.containerMessageId ?? containerMessageId,
        live: known.live || live,
      });
    };
    for (const list of snapshot?.artifacts ?? []) consider(list, null, true);
    for (const message of snapshot?.messages ?? []) for (const list of message.draftSnapshot) consider(list, message.id, false);
    for (const page of snapshot ? history.data?.pages ?? [] : []) for (const item of page.items)
      for (const list of item.draftSnapshot) consider(list, item.messageId, false);
    return [...byId.values()];
  }, [snapshot, history.data]);

  const updateReviewItem = useCallback(async (list: ArtifactEnvelopeDto, version: number,
    item: EditedDraftItemDto | EditedNoteDraftItemDto): Promise<string | null> => {
    if (snapshotRef.current?.conversationVersion !== version || snapshotRef.current.pendingList?.version !== list.version)
      return "StaleDraftVersion";
    return edit(list.id, { items: reviewedItems(list).items.map(value => value.itemId === item.itemId ? item : value) });
  }, [edit]);

  const rateMessage = useCallback(async (messageId: string, rating: AiCoachRating): Promise<boolean> => {
    if (!conversationId || feedbackPending.current.has(messageId)) return false;
    feedbackPending.current.add(messageId);
    setFeedbackSaving((state) => ({ ...state, [messageId]: true }));
    const previous = feedbackByMessage[messageId];
    const next = previous?.rating === rating ? null : {
      assistantMessageId: messageId, rating, reason: null, detail: null,
    };
    setFeedbackByMessage((state) => {
      const updated = { ...state };
      if (next) updated[messageId] = next;
      else delete updated[messageId];
      return updated;
    });
    try {
      if (next) {
        const saved = await aiCoachService.putMessageFeedback(conversationId, messageId, rating);
        setFeedbackByMessage((state) => ({ ...state, [messageId]: saved }));
      } else {
        await aiCoachService.deleteMessageFeedback(conversationId, messageId);
      }
      return true;
    } catch {
      setFeedbackByMessage((state) => {
        const updated = { ...state };
        if (previous) updated[messageId] = previous;
        else delete updated[messageId];
        return updated;
      });
      return false;
    } finally {
      feedbackPending.current.delete(messageId);
      setFeedbackSaving((state) => ({ ...state, [messageId]: false }));
    }
  }, [conversationId, feedbackByMessage]);

  const saveFeedbackDetail = useCallback(async (messageId: string, reason: string | null,
    detail: string | null): Promise<boolean> => {
    if (!conversationId || feedbackPending.current.has(messageId)
      || feedbackByMessage[messageId]?.rating !== "down") return false;
    feedbackPending.current.add(messageId);
    setFeedbackSaving((state) => ({ ...state, [messageId]: true }));
    const previous = feedbackByMessage[messageId];
    setFeedbackByMessage((state) => ({ ...state, [messageId]: {
      ...previous, reason, detail,
    } }));
    try {
      const saved = await aiCoachService.putMessageFeedback(conversationId, messageId, "down", reason, detail);
      setFeedbackByMessage((state) => ({ ...state, [messageId]: saved }));
      return true;
    } catch {
      setFeedbackByMessage((state) => ({ ...state, [messageId]: previous }));
      return false;
    } finally {
      feedbackPending.current.delete(messageId);
      setFeedbackSaving((state) => ({ ...state, [messageId]: false }));
    }
  }, [conversationId, feedbackByMessage]);

  const changeTopic = useCallback(async (clear: boolean): Promise<string | null> => {
    if (!snapshotRef.current || busy.current || ticking.current.size > 0) return "NotReady";
    busy.current = true;
    lifecycle.current += 1;
    setStatus("sending");
    try {
      if (clear) {
        await aiCoachService.clearChat();
        await queryClient.cancelQueries({ queryKey: chatMessagesKey });
        queryClient.setQueryData<InfiniteData<ChatTimelinePageDto, string | null>>(chatMessagesKey, { pages: [], pageParams: [] });
        snapshotRef.current = null;
        setSnapshot(null);
      }
      applySnapshot(clear ? await aiCoachService.openChat() : await aiCoachService.newTopic());
      setFeedbackByMessage({});
      refreshHistory();
      return null;
    } catch (error) {
      if (!snapshotRef.current) setStatus("startFailed");
      return await resync(error);
    } finally {
      busy.current = false;
      if (snapshotRef.current) setStatus("ready");
    }
  }, [applySnapshot, queryClient, refreshHistory, resync]);

  // Snapshot data wins over cached timeline rows, so recent card statuses never regress.
  const merged = new Map<string, ChatItem>();
  if (pendingMessage) merged.set(pendingMessage.id, pendingMessage);
  if (streamingReply) merged.set(streamingReply.id, streamingReply);
  for (const message of [...(snapshot?.messages ?? [])].reverse()) merged.set(message.id, {
    ...message, conversationId: snapshot!.conversationId,
  });
  for (const page of snapshot ? history.data?.pages ?? [] : []) for (const item of page.items) {
    if (!merged.has(item.messageId)) merged.set(item.messageId, {
      id: item.messageId, conversationId: item.conversationId, role: item.role, text: item.content,
      createdAt: item.createdAt, topicStart: item.topicStart, draftSnapshot: item.draftSnapshot,
    });
  }
  const messages = [...merged.values()].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  const keyFor = useCallback((item: ChatItem) => rowKeys[item.id] ?? item.id, [rowKeys]);
  return { snapshot, messages, keyFor, status, start, send, confirm, edit, reject, streaming, reconnecting,
    reviewLists, wantedAdded, tickItem, tickBusy, updateReviewItem,
    feedbackByMessage, feedbackSaving, rateMessage, saveFeedbackDetail,
    newTopic: () => changeTopic(false), clearChat: () => changeTopic(true),
    loadOlder: () => { if (history.hasNextPage && !history.isFetchingNextPage) void history.fetchNextPage(); },
    retryHistory: () => { void history.refetch(); },
    loadingOlder: history.isFetchingNextPage, historyLoading: history.isPending, historyError: history.isError,
  };
}
