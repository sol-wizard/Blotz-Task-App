import { useCallback, useEffect, useRef, useState } from "react";
import { AxiosError } from "axios";
import uuid from "react-native-uuid";
import {
  ConfirmDraftResultDto,
  ConversationConflictDto,
  ConversationSnapshotDto,
  EditedDraftDto,
} from "../models/ai-coach-dto";
import * as aiCoachService from "../services/ai-coach-service";

export interface ChatItem {
  id: string;
  role: "user" | "assistant";
  text: string;
}

export type ChatStatus = "idle" | "connecting" | "ready" | "sending" | "startFailed";

export type ConfirmAction = "start_now" | "add_to_task_list";

export interface ConfirmOutcome {
  result: ConfirmDraftResultDto | null;
  errorCode: string | null;
}

/**
 * Execution-mode conversation state. The server snapshot is authoritative: this hook only
 * keeps the local chat transcript for display and forwards user intents. Buttons come from
 * snapshot.allowedActions — never decided here.
 *
 * `enabled` gates the conversation start: the chat UI can sit idle (grey input on AI Home)
 * until the user picks a mode, then flipping it to true starts the conversation in place.
 */
export function useAiCoachChat(enabled: boolean = true) {
  const [snapshot, setSnapshot] = useState<ConversationSnapshotDto | null>(null);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [status, setStatus] = useState<ChatStatus>(enabled ? "connecting" : "idle");
  const startedRef = useRef(false);

  const applySnapshot = useCallback((next: ConversationSnapshotDto, appendAssistant: boolean) => {
    setSnapshot(next);
    if (appendAssistant && next.assistantMessage) {
      const text = next.assistantMessage;
      setMessages((prev) =>
        prev.length > 0 && prev[prev.length - 1].role === "assistant" &&
        prev[prev.length - 1].text === text
          ? prev
          : [...prev, { id: uuid.v4() as string, role: "assistant", text }],
      );
    }
  }, []);

  const start = useCallback(async () => {
    setStatus("connecting");
    try {
      const dto = await aiCoachService.startConversation();
      applySnapshot(dto, false);
      setStatus("ready");
    } catch {
      setStatus("startFailed");
    }
  }, [applySnapshot]);

  useEffect(() => {
    // Every entry into Execution mode starts a fresh conversation (requirements §8.1).
    if (enabled && !startedRef.current) {
      startedRef.current = true;
      void start();
    }
  }, [enabled, start]);

  const resyncFromConflict = useCallback(
    (error: unknown): string | null => {
      const axiosError = error as AxiosError<ConversationConflictDto>;
      const body = axiosError.response?.data;
      if (body?.conversationSnapshot) {
        applySnapshot(body.conversationSnapshot, true);
      }
      return body?.errorCode ?? null;
    },
    [applySnapshot],
  );

  const send = useCallback(
    async (text: string): Promise<string | null> => {
      if (!snapshot) return "NotReady";
      const content = text.trim();
      if (content.length === 0) return null;

      setStatus("sending");
      setMessages((prev) => [...prev, { id: uuid.v4() as string, role: "user", text: content }]);
      try {
        const dto = await aiCoachService.sendMessage(
          snapshot.conversationId,
          content,
          snapshot.conversationVersion,
          uuid.v4() as string,
        );
        applySnapshot(dto, true);
        return null;
      } catch (error) {
        return resyncFromConflict(error) ?? "SendFailed";
      } finally {
        setStatus("ready");
      }
    },
    [snapshot, applySnapshot, resyncFromConflict],
  );

  const confirm = useCallback(
    async (action: ConfirmAction, edited: EditedDraftDto): Promise<ConfirmOutcome> => {
      const artifact = snapshot?.currentArtifact;
      if (!snapshot || !artifact) {
        return { result: null, errorCode: "NotReady" };
      }

      setStatus("sending");
      try {
        const result = await aiCoachService.confirmDraft(snapshot.conversationId, artifact.id, {
          commandId: uuid.v4() as string,
          expectedConversationVersion: snapshot.conversationVersion,
          expectedDraftVersion: artifact.version,
          action,
          editedDraft: edited,
        });
        applySnapshot(result.conversationSnapshot, true);
        return { result, errorCode: result.errorCode };
      } catch (error) {
        const axiosError = error as AxiosError<ConfirmDraftResultDto & ConversationConflictDto>;
        const body = axiosError.response?.data;
        if (body?.conversationSnapshot) {
          applySnapshot(body.conversationSnapshot, true);
        }
        return {
          result: body && "status" in body ? body : null,
          errorCode: body?.errorCode ?? "ConfirmFailed",
        };
      } finally {
        setStatus("ready");
      }
    },
    [snapshot, applySnapshot],
  );

  const reject = useCallback(async (): Promise<string | null> => {
    const artifact = snapshot?.currentArtifact;
    if (!snapshot || !artifact) return "NotReady";
    setStatus("sending");
    try {
      const dto = await aiCoachService.rejectDraft(
        snapshot.conversationId,
        artifact.id,
        uuid.v4() as string,
        snapshot.conversationVersion,
      );
      applySnapshot(dto, true);
      return null;
    } catch (error) {
      return resyncFromConflict(error) ?? "RejectFailed";
    } finally {
      setStatus("ready");
    }
  }, [snapshot, applySnapshot, resyncFromConflict]);

  return { snapshot, messages, status, start, send, confirm, reject };
}
