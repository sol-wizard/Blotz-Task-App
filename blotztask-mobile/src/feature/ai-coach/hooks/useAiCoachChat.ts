import { useCallback, useEffect, useRef, useState } from "react";
import { AxiosError } from "axios";
import uuid from "react-native-uuid";
import {
  AvailableAiCoachMode,
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
}
export type ChatStatus = "idle" | "connecting" | "ready" | "sending" | "startFailed";
export type ConfirmAction = "start_now" | "add_to_task_list";
export interface ConfirmOutcome {
  result: ConfirmDraftResultDto | null;
  errorCode: string | null;
  scheduleAssessment?: DraftScheduleAssessmentDto | null;
}

export function useAiCoachChat(mode: AvailableAiCoachMode | null = "Execution") {
  const [snapshot, setSnapshot] = useState<ConversationSnapshotDto | null>(null);
  const [status, setStatus] = useState<ChatStatus>(mode ? "connecting" : "idle");
  const [pendingMessage, setPendingMessage] = useState<ChatItem | null>(null);
  const [feedbackByMessage, setFeedbackByMessage] = useState<Record<string, MessageFeedbackDto>>({});
  const [feedbackSaving, setFeedbackSaving] = useState<Record<string, boolean>>({});
  const feedbackPending = useRef(new Set<string>());
  const busy = useRef(false);
  const applySnapshot = useCallback((next: ConversationSnapshotDto) => {
    setSnapshot((previous) =>
      previous?.conversationId === next.conversationId &&
      previous.conversationVersion > next.conversationVersion
        ? previous
        : next,
    );
  }, []);

  const start = useCallback(async () => {
    if (!mode) return;
    setStatus("connecting");
    try {
      applySnapshot(await aiCoachService.startConversation(mode));
      setStatus("ready");
    } catch {
      setStatus("startFailed");
    }
  }, [mode, applySnapshot]);

  useEffect(() => {
    if (!mode) return;
    let cancelled = false;
    void aiCoachService.startConversation(mode).then(
      (next) => {
        if (!cancelled) {
          applySnapshot(next);
          setStatus("ready");
        }
      },
      () => {
        if (!cancelled) setStatus("startFailed");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [mode, applySnapshot]);

  const resync = useCallback(
    async (error: unknown): Promise<string> => {
      const body = (error as AxiosError<ConversationConflictDto>).response?.data;
      if (body?.conversationSnapshot) applySnapshot(body.conversationSnapshot);
      else if (snapshot) {
        try {
          applySnapshot(await aiCoachService.fetchSnapshot(snapshot.conversationId));
        } catch {
          /* Keep visible data when the network is offline. */
        }
      }
      return body?.errorCode ?? "RequestFailed";
    },
    [snapshot, applySnapshot],
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
          if (!cancelled) applySnapshot(next);
        })
        .catch(() => undefined);
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [serverBusy, conversationId, applySnapshot]);

  const send = useCallback(
    async (text: string): Promise<string | null> => {
      if (!snapshot || busy.current) return "NotReady";
      const content = text.trim();
      if (!content) return null;
      busy.current = true;
      setStatus("sending");
      const messageId = uuid.v4() as string;
      setPendingMessage({ id: messageId, role: "user", text: content });
      try {
        const next = await aiCoachService.sendMessage(
          snapshot.conversationId,
          content,
          snapshot.conversationVersion,
          messageId,
        );
        applySnapshot(next);
        return next.generationError;
      } catch (error) {
        return await resync(error);
      } finally {
        busy.current = false;
        setPendingMessage(null);
        setStatus("ready");
      }
    },
    [snapshot, applySnapshot, resync],
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
    [snapshot, applySnapshot, resync],
  );

  const edit = useCallback(
    async (draftId: string, edited: EditedDraftDto): Promise<string | null> => {
      const draft = snapshot?.artifacts.find((item) => item.id === draftId);
      if (!snapshot || !draft || busy.current) return "NotReady";
      busy.current = true;
      setStatus("sending");
      try {
        applySnapshot(
          await aiCoachService.editDraft(snapshot.conversationId, draftId, {
            expectedConversationVersion: snapshot.conversationVersion,
            expectedDraftVersion: draft.version,
            editedDraft: edited,
          }),
        );
        return null;
      } catch (error) {
        return await resync(error);
      } finally {
        busy.current = false;
        setStatus("ready");
      }
    },
    [snapshot, applySnapshot, resync],
  );

  const reject = useCallback(
    async (draftId: string): Promise<string | null> => {
      if (!snapshot || busy.current) return "NotReady";
      busy.current = true;
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
        return null;
      } catch (error) {
        return await resync(error);
      } finally {
        busy.current = false;
        setStatus("ready");
      }
    },
    [snapshot, applySnapshot, resync],
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

  const messages: ChatItem[] = snapshot?.messages ?? [];
  const visibleMessages =
    pendingMessage && !messages.some((message) => message.id === pendingMessage.id)
      ? [...messages, pendingMessage]
      : messages;
  return { snapshot, messages: visibleMessages, status, start, send, confirm, edit, reject,
    feedbackByMessage, feedbackSaving, rateMessage, saveFeedbackDetail };
}
