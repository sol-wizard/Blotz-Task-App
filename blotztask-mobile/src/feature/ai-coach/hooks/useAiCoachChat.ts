import { useCallback, useEffect, useRef, useState } from "react";
import { AxiosError } from "axios";
import { InfiniteData, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import uuid from "react-native-uuid";
import { ddlKeys, taskKeys } from "@/shared/constants/query-key-factory";
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
} from "../models/ai-coach-dto";
import * as aiCoachService from "../services/ai-coach-service";

export interface ChatItem {
  id: string;
  role: "user" | "assistant";
  text: string;
  taskContextRead?: boolean;
  conversationId: string;
  createdAt: string;
  topicStart: boolean;
  draftSnapshot: ArtifactEnvelopeDto[];
}
export type ChatStatus = "idle" | "connecting" | "ready" | "sending" | "startFailed";
export type ConfirmAction = "start_now" | "add_to_task_list";
export interface ConfirmOutcome {
  result: ConfirmDraftResultDto | null;
  errorCode: string | null;
  scheduleAssessment?: DraftScheduleAssessmentDto | null;
}

export const chatMessagesKey = ["aiCoach", "chat", "messages"] as const;

export function useAiCoachChat() {
  const queryClient = useQueryClient();
  const [snapshot, setSnapshot] = useState<ConversationSnapshotDto | null>(null);
  const [status, setStatus] = useState<ChatStatus>("connecting");
  const [pendingMessage, setPendingMessage] = useState<ChatItem | null>(null);
  const [feedbackByMessage, setFeedbackByMessage] = useState<Record<string, MessageFeedbackDto>>({});
  const [feedbackSaving, setFeedbackSaving] = useState<Record<string, boolean>>({});
  const feedbackPending = useRef(new Set<string>());
  const busy = useRef(false);
  const lifecycle = useRef(0);
  const snapshotRef = useRef<ConversationSnapshotDto | null>(null);
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
    if (!serverBusy || !conversationId) return;
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
  }, [serverBusy, conversationId, applySnapshot, applyOpenSnapshot]);

  const send = useCallback(
    async (text: string): Promise<string | null> => {
      if (!snapshot || busy.current) return "NotReady";
      const content = text.trim();
      if (!content) return null;
      busy.current = true;
      lifecycle.current += 1;
      setStatus("sending");
      const messageId = uuid.v4() as string;
      setPendingMessage({ id: messageId, role: "user", text: content, conversationId: snapshot.conversationId,
        createdAt: new Date().toISOString(), topicStart: snapshot.messages.length === 0, draftSnapshot: [] });
      try {
        const next = await aiCoachService.sendMessage(
          snapshot.conversationId,
          content,
          snapshot.conversationVersion,
          messageId,
        );
        applySnapshot(next);
        refreshHistory();
        return next.generationError;
      } catch (error) {
        return await resync(error);
      } finally {
        busy.current = false;
        setPendingMessage(null);
        setStatus("ready");
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
      if (!snapshot || !draft || busy.current) return "NotReady";
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
      if (!snapshot || busy.current) return "NotReady";
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
    if (!snapshotRef.current || busy.current) return "NotReady";
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
  return { snapshot, messages, status, start, send, confirm, edit, reject,
    feedbackByMessage, feedbackSaving, rateMessage, saveFeedbackDetail,
    newTopic: () => changeTopic(false), clearChat: () => changeTopic(true),
    loadOlder: () => { if (history.hasNextPage && !history.isFetchingNextPage) void history.fetchNextPage(); },
    retryHistory: () => { void history.refetch(); },
    loadingOlder: history.isFetchingNextPage, historyError: history.isError,
  };
}
