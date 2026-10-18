import { fetch } from "expo/fetch";
import { router } from "expo-router";
import { API_CONFIG } from "@/shared/services/api/config";
import { clearTokens, forceRefreshAuthToken, getAuthToken } from "@/shared/services/api/token-manager";
import { queryClient } from "@/shared/util/queryClient";
import { AUTH_QUERY_KEY } from "@/shared/hooks/useAuth";
import { ConversationSnapshotDto } from "../models/ai-coach-dto";
import { CoachStreamEvent, createCoachStreamParser } from "../models/coach-stream";

class CoachStreamError extends Error {
  constructor(public response: { status: number; data: unknown }) {
    super("Coach stream request failed");
  }
}

export async function streamCoachMessage(
  conversationId: string,
  content: string,
  expectedVersion: number,
  messageId: string,
  onEvent: (event: CoachStreamEvent) => void,
  signal: AbortSignal,
): Promise<ConversationSnapshotDto> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) controller.abort();
  let timer: ReturnType<typeof setTimeout>;
  const touch = () => {
    clearTimeout(timer);
    timer = setTimeout(abort, 45000);
  };
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    touch();
    if (!API_CONFIG.baseURL) throw new Error("API base URL is missing");
    const url = `${API_CONFIG.baseURL.replace(/\/$/, "")}/ai-coach/conversations/${conversationId}/messages/stream`;
    const body = JSON.stringify({ messageId, content, expectedVersion, timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone });
    const request = (token: string | null) => fetch(url, {
      method: "POST", body, signal: controller.signal,
      headers: { "Content-Type": "application/json", Accept: "text/event-stream",
        "X-Ai-Coach-Protocol": "6", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    let response = await request(await getAuthToken());
    if (response.status === 401) {
      await response.body?.cancel();
      const token = await forceRefreshAuthToken();
      if (token) response = await request(token);
      if (!token || response.status === 401) {
        await clearTokens();
        queryClient.setQueryData(AUTH_QUERY_KEY, false);
        router.replace("/(auth)/signin");
        throw new Error("Authentication required");
      }
    }
    if (!response.ok) {
      const data: unknown = await response.json();
      throw new CoachStreamError({ status: response.status, data });
    }
    if (!response.headers.get("content-type")?.includes("text/event-stream") || !response.body)
      throw new Error("Expected coach event stream");

    let terminal: ConversationSnapshotDto | undefined;
    let ended = false;
    const parse = createCoachStreamParser(messageId, (event) => {
      if (ended) throw new Error("Event after coach turn finished");
      onEvent(event);
      if (event.type === "turn.completed" || event.type === "turn.failed") {
        terminal = event.payload.conversationSnapshot;
        ended = true;
      }
    });
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (!ended) {
      const { value, done } = await reader.read();
      touch();
      if (done) {
        parse(decoder.decode());
        break;
      }
      parse(decoder.decode(value, { stream: true }));
    }
    if (!terminal) throw new Error("Coach stream ended before a saved result arrived");
    return terminal;
  } finally {
    clearTimeout(timer!);
    signal.removeEventListener("abort", abort);
    // Do not keep a response or idle timer alive after navigation or a malformed stream.
    controller.abort();
    if (reader) {
      try { await reader.cancel(); } catch { /* Already disconnected. */ }
      reader.releaseLock();
    }
  }
}
