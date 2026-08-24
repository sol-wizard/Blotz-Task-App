/**
 * AI Coach client protocol types — mirror of the backend §18 response body
 * (Modules/AiCoach/Application/Projections/ConversationSnapshotDto.cs).
 * The client renders ONLY what allowedActions contains; no button is hard-coded.
 */

export type ConversationActionWire =
  | "send_message"
  | "start_now"
  | "add_to_task_list"
  | "reject_draft"
  | "retry_confirm";

export type ConversationStateWire =
  | "conversing"
  | "clarifying"
  | "draft_pending"
  | "draft_handled"
  | "closed";

export type GenerationStatusWire = "idle" | "running" | "blocked";

export type BlockedReasonWire =
  | "quota"
  | "content_filtered"
  | "model_unavailable"
  | "configuration_error"
  | "other";

/** One task on the draft card. */
export interface TaskDraftItemDto {
  itemId: string;
  title: string;
  description: string | null;
  /** yyyy-MM-dd in the conversation time zone */
  date: string;
  /** 24-hour HH:mm */
  startTime: string;
  endTime: string;
  timeZoneId: string;
  labelId: number | null;
  estimatedMinutes: number;
  /** Set once this item became a real task (also after a partially failed confirm). */
  persistedTaskId: number | null;
}

/** The card: one or more tasks (protocolVersion 2). The client renders one row per item. */
export interface TaskDraftPayloadDto {
  items: TaskDraftItemDto[];
  /** Sum of all items' durations. */
  estimatedMinutes: number;
  /**
   * Server-computed min(15, estimated minutes) — never computed on the client.
   * Only present for a single-task card; a multi-task card has no focus preview.
   */
  focusMinutes: number | null;
}

export interface ArtifactEnvelopeDto {
  id: string;
  type: string;
  schemaVersion: number;
  version: number;
  status: "pending" | "processing" | "accepted" | "rejected" | "superseded" | "expired";
  payload: TaskDraftPayloadDto;
}

export interface ConversationSnapshotDto {
  protocolVersion: number;
  conversationId: string;
  conversationVersion: number;
  mode: string;
  state: ConversationStateWire;
  generationStatus: GenerationStatusWire;
  blockedReason: BlockedReasonWire | null;
  assistantMessage: string | null;
  currentArtifact: ArtifactEnvelopeDto | null;
  allowedActions: ConversationActionWire[];
  /**
   * TEMPORARY (2026-08-24): running token/cost total of this conversation, shown as a small
   * debug line while testing. Remove together with the backend's DebugUsage field.
   */
  debugUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estUsd: number | null;
  } | null;
}

export interface EditedDraftItemDto {
  itemId: string;
  title: string;
  description?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  timeZoneId: string;
  labelId?: number | null;
}

/**
 * The card as the user confirms it. Tasks the user removed are simply absent; the client
 * cannot add tasks the model never proposed (that is a new chat turn).
 */
export interface EditedDraftDto {
  items: EditedDraftItemDto[];
}

export interface ConfirmDraftRequestDto {
  commandId: string;
  expectedConversationVersion: number;
  expectedDraftVersion: number;
  action: Extract<ConversationActionWire, "start_now" | "add_to_task_list">;
  editedDraft: EditedDraftDto;
}

export interface ConfirmDraftResultDto {
  commandId: string;
  status: "succeeded" | "failed";
  errorCode: string | null;
  /** Every task created by this confirmation (and earlier retries of the same card). */
  persistedEntities: { kind: string; id: string }[];
  clientDirective: {
    type: string;
    associationId: string;
    focusMinutes: number;
    returnToAi: boolean;
  } | null;
  conversationSnapshot: ConversationSnapshotDto;
}

/** 409 responses carry the latest snapshot so the client can resync (§18). */
export interface ConversationConflictDto {
  errorCode: string;
  conversationSnapshot: ConversationSnapshotDto | null;
}
