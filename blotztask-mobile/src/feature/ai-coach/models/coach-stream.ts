import type { ArtifactEnvelopeDto, ConversationSnapshotDto } from "./ai-coach-dto";

interface EventEnvelope {
  conversationId: string;
  turnId: string;
  sequence: number;
}

export type CoachStreamEvent = EventEnvelope & (
  | { type: "turn.started"; payload: { conversationId: string; conversationVersion: number } }
  | { type: "reply.delta"; payload: { text: string } }
  | { type: "reply.reset"; payload: Record<string, never> }
  | { type: "review.preview"; payload: { pendingList: ArtifactEnvelopeDto | null } }
  | { type: "turn.completed"; payload: { conversationSnapshot: ConversationSnapshotDto; errorCode: null } }
  | { type: "turn.failed"; payload: { conversationSnapshot?: ConversationSnapshotDto; errorCode: string } }
);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function snapshot(value: unknown): value is ConversationSnapshotDto {
  return record(value) && typeof value.conversationId === "string" && typeof value.conversationVersion === "number"
    && Array.isArray(value.messages) && Array.isArray(value.artifacts) && Array.isArray(value.allowedActions)
    && ["idle", "running", "failed"].includes(String(value.generationStatus));
}

function artifact(value: unknown): value is ArtifactEnvelopeDto {
  return record(value) && typeof value.id === "string" && typeof value.version === "number"
    && value.isReviewList === true && record(value.payload) && Array.isArray(value.payload.items)
    && value.payload.items.every((item: unknown) => record(item) && typeof item.itemId === "string"
      && typeof item.title === "string" && (item.kind === "task" || item.kind === "note"));
}

function parseEvent(data: string): CoachStreamEvent {
  const value: unknown = JSON.parse(data);
  if (!record(value) || typeof value.conversationId !== "string" || typeof value.turnId !== "string"
    || !Number.isSafeInteger(value.sequence) || Number(value.sequence) < 1 || !record(value.payload)) {
    throw new Error("Invalid coach stream envelope");
  }
  const payload = value.payload;
  const valid = (() => {
    switch (value.type) {
      case "turn.started": return typeof payload.conversationId === "string" && typeof payload.conversationVersion === "number";
      case "reply.delta": return typeof payload.text === "string";
      case "reply.reset": return true;
      case "review.preview": return payload.pendingList === null || artifact(payload.pendingList);
      case "turn.completed": return snapshot(payload.conversationSnapshot) && payload.errorCode === null;
      case "turn.failed": return typeof payload.errorCode === "string"
        && (payload.conversationSnapshot === undefined || snapshot(payload.conversationSnapshot));
      default: return false;
    }
  })();
  if (!valid) throw new Error("Invalid coach stream payload");
  return value as unknown as CoachStreamEvent;
}

/** SSE frames and UTF-8/network chunks have independent boundaries. Heartbeats carry no data. */
export function createCoachStreamParser(turnId: string, onEvent: (event: CoachStreamEvent) => void) {
  let buffer = "";
  let data: string[] = [];
  let frameSize = 0;
  let sequence = 0;
  let conversationId: string | null = null;
  return (chunk: string) => {
    buffer += chunk;
    if (buffer.length + frameSize > 8 * 1024 * 1024) throw new Error("Coach stream event too large");
    let end: number;
    while ((end = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, end).replace(/\r$/, "");
      buffer = buffer.slice(end + 1);
      if (line === "") {
        if (data.length) {
          const event = parseEvent(data.join("\n"));
          if (event.turnId !== turnId) throw new Error("Unexpected coach turn");
          conversationId ??= event.conversationId;
          if (event.conversationId !== conversationId) throw new Error("Unexpected coach conversation");
          if (event.sequence > sequence) {
            if (event.sequence !== sequence + 1) throw new Error("Missing coach stream event");
            sequence = event.sequence;
            onEvent(event);
          }
        }
        data = [];
        frameSize = 0;
      } else if (line.startsWith("data:")) {
        const value = line.slice(5).replace(/^ /, "");
        data.push(value);
        frameSize += value.length;
        if (frameSize > 8 * 1024 * 1024) throw new Error("Coach stream event too large");
      }
    }
  };
}
