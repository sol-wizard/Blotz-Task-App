export type ConversationActionWire =
  | "send_message"
  | "start_now"
  | "add_to_task_list"
  | "reject_draft"
  | "edit_draft";
export type AvailableAiCoachMode = "Execution" | "Clarify" | "Companion";
export type AiCoachRating = "up" | "down";
export interface MessageFeedbackDto {
  assistantMessageId: string;
  rating: AiCoachRating;
  reason: string | null;
  detail: string | null;
}

export interface DraftRecurrenceDto {
  frequency: "Daily" | "Weekly" | "Monthly" | "Yearly";
  interval: number;
  daysOfWeek: number | null;
  dayOfMonth: number | null;
  endDate: string | null;
}

export interface TaskDraftItemDto {
  itemId: string;
  title: string;
  description: string | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  timeZoneId: string;
  labelId: number | null;
  estimatedMinutes: number | null;
  persistedTaskId: number | null;
  recurrence: DraftRecurrenceDto | null;
}

export interface TaskDraftPayloadDto {
  items: TaskDraftItemDto[];
  estimatedMinutes: number | null;
  focusMinutes: number | null;
}

export interface ArtifactEnvelopeDto {
  id: string;
  version: number;
  status: "pending" | "processing" | "completed" | "rejected";
  saveError: string | null;
  payload: TaskDraftPayloadDto;
  allowedActions: ConversationActionWire[];
  schedule: {
    status: "clear" | "conflict" | "unverified" | "incomplete" | "partial";
    checkedAt: string;
    conflicts: { itemId: string; taskIdentity: string; taskTitle: string; start: string; end: string }[];
    conflictToken: string | null;
    scope: "scheduled" | "start_now";
  } | null;
}

export interface ConversationSnapshotDto {
  protocolVersion: number;
  conversationId: string;
  conversationVersion: number;
  mode: AvailableAiCoachMode;
  generationStatus: "idle" | "running" | "failed";
  generationError: string | null;
  messages: { id: string; role: "user" | "assistant"; text: string; taskContextRead: boolean }[];
  artifacts: ArtifactEnvelopeDto[];
  allowedActions: ConversationActionWire[];
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
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  timeZoneId: string;
  labelId?: number | null;
  recurrence: DraftRecurrenceDto | null;
}
export interface EditedDraftDto {
  items: EditedDraftItemDto[];
}
export interface EditDraftRequestDto {
  expectedConversationVersion: number;
  expectedDraftVersion: number;
  editedDraft: EditedDraftDto;
}
export interface ConfirmDraftRequestDto extends EditDraftRequestDto {
  commandId: string;
  action: "start_now" | "add_to_task_list";
  allowScheduleConflict?: boolean;
  acceptedConflictToken?: string | null;
}
export interface ConfirmDraftResultDto {
  commandId: string;
  status: "succeeded" | "failed";
  errorCode: string | null;
  persistedEntities: { kind: string; id: string; seriesId: string | null }[];
  clientDirective: {
    type: string;
    associationId: string;
    focusMinutes: number;
    returnToAi: boolean;
  } | null;
  conversationSnapshot: ConversationSnapshotDto;
}
export interface ConversationConflictDto {
  errorCode: string;
  conversationSnapshot: ConversationSnapshotDto | null;
}
