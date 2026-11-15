export type ConversationActionWire =
  | "send_message"
  | "add_to_task_list"
  | "add_all"
  | "set_item_added"
  | "reject_draft"
  | "edit_draft";
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
  kind: "task" | "note";
  persistedNoteId: string | null;
  suggestedFields: ("date" | "startTime" | "endTime")[];
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
  /** The reply that first suggested this item, so its card sits under it; absent on older items. */
  suggestedInMessageId?: string | null;
}

export interface TaskDraftPayloadDto {
  items: TaskDraftItemDto[];
  estimatedMinutes: number | null;
}

export interface DraftScheduleAssessmentDto {
  status: "clear" | "conflict" | "unverified" | "incomplete" | "partial";
  checkedAt: string;
  conflicts: { itemId: string; taskIdentity: string; taskTitle: string; start: string; end: string }[];
  conflictToken: string | null;
  scope: "scheduled";
  /** Why the check is "unverified". "too_many_dates" cannot pass on retry; absent for a failed read or an older server. */
  reason?: "too_many_dates" | null;
}

export interface ArtifactEnvelopeDto {
  isReviewList: boolean;
  canConfirm: boolean;
  validationErrors: string[];
  id: string;
  version: number;
  status: "pending" | "processing" | "completed" | "rejected" | "expired";
  saveError: string | null;
  payload: TaskDraftPayloadDto;
  allowedActions: ConversationActionWire[];
  schedule: DraftScheduleAssessmentDto | null;
}

export interface ConversationSnapshotDto {
  pendingList: ArtifactEnvelopeDto | null;
  protocolVersion: number;
  conversationId: string;
  conversationVersion: number;
  generationStatus: "idle" | "running" | "failed";
  generationError: string | null;
  messages: { id: string; role: "user" | "assistant"; text: string; taskContextRead: boolean;
    createdAt: string; topicStart: boolean; draftSnapshot: ArtifactEnvelopeDto[] }[];
  artifacts: ArtifactEnvelopeDto[];
  allowedActions: ConversationActionWire[];
  /** Tap-to-send next messages for the latest reply; absent from older servers. */
  followUps?: string[];
  debugUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estUsd: number | null;
  } | null;
}

export interface ChatTimelineItemDto {
  messageId: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  topicStart: boolean;
  draftSnapshot: ArtifactEnvelopeDto[];
}
export interface ChatTimelinePageDto {
  items: ChatTimelineItemDto[];
  nextCursor: string | null;
}

export interface EditedDraftItemDto {
  kind?: "task" | "note";
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
export interface EditedNoteDraftItemDto {
  kind: "note";
  itemId: string;
  title: string;
  description: string | null;
}
export interface EditedDraftDto {
  items: (EditedDraftItemDto | EditedNoteDraftItemDto)[];
}
export interface EditDraftRequestDto {
  expectedConversationVersion: number;
  expectedDraftVersion: number;
  editedDraft: EditedDraftDto;
}
export interface ConfirmDraftRequestDto extends EditDraftRequestDto {
  commandId: string;
  action: "add_to_task_list" | "add_all";
  selectedItemIds?: string[];
  allowScheduleConflict?: boolean;
  acceptedConflictToken?: string | null;
}
export interface ConfirmDraftResultDto {
  commandId: string;
  status: "succeeded" | "failed";
  errorCode: string | null;
  persistedEntities: { kind: string; id: string; seriesId: string | null }[];
  conversationSnapshot: ConversationSnapshotDto;
}
/** Conflicts are existing tasks that a newly saved task overlaps. */
export interface SetDraftItemAddedResultDto {
  conversationSnapshot: ConversationSnapshotDto;
  conflicts: DraftScheduleAssessmentDto["conflicts"];
}
export interface ConversationConflictDto {
  errorCode: string;
  conversationSnapshot: ConversationSnapshotDto | null;
  scheduleAssessment?: DraftScheduleAssessmentDto | null;
}
