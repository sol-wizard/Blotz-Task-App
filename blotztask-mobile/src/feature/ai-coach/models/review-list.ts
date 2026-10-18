import type {
  ArtifactEnvelopeDto,
  ConfirmDraftRequestDto,
  ConversationSnapshotDto,
  EditedDraftDto,
  EditedDraftItemDto,
  EditedNoteDraftItemDto,
  TaskDraftItemDto,
} from "./ai-coach-dto";

export interface ReviewConfirmation {
  conversationId: string;
  draftId: string;
  request: ConfirmDraftRequestDto;
}

// UI editors receive only fields relevant to their item kind.
export type ReviewItem =
  | { kind: "task"; fields: EditedDraftItemDto; suggestions: TaskDraftItemDto["suggestedFields"] }
  | { kind: "note"; fields: EditedNoteDraftItemDto };

export function toReviewItem(item: TaskDraftItemDto): ReviewItem {
  if (item.kind === "note")
    return {
      kind: "note",
      fields: {
        kind: "note",
        itemId: item.itemId,
        title: item.title,
        description: item.description,
      },
    };
  return {
    kind: "task",
    suggestions: item.suggestedFields ?? [],
    fields: {
      kind: "task",
      itemId: item.itemId,
      title: item.title,
      description: item.description,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      timeZoneId: item.timeZoneId,
      labelId: item.labelId,
      recurrence: item.recurrence,
    },
  };
}

export function reviewedItems(list: ArtifactEnvelopeDto): EditedDraftDto {
  return { items: list.payload.items.map((item) => toReviewItem(item).fields) };
}

export function noteTextLength(title: string, description: string): number {
  return (title.trim() + (description.trim() ? "\n" + description.trim() : "")).length;
}

/** An uncertain attempt must retain both its ID and reviewed payload, including old versions. */
export function prepareReviewConfirmation(
  snapshot: ConversationSnapshotDto,
  commandId: string,
  retained: ReviewConfirmation | null,
  allowScheduleConflict = false,
  acceptedConflictToken?: string | null,
): ReviewConfirmation | null {
  if (retained) return retained;
  const list = snapshot.pendingList;
  if (!list) return null;
  return {
    conversationId: snapshot.conversationId,
    draftId: list.id,
    request: {
      commandId,
      action: "add_all",
      expectedConversationVersion: snapshot.conversationVersion,
      expectedDraftVersion: list.version,
      editedDraft: reviewedItems(list),
      allowScheduleConflict,
      acceptedConflictToken,
    },
  };
}

export function reviewConfirmationSaved(
  operation: ReviewConfirmation,
  snapshot: ConversationSnapshotDto,
): boolean {
  return (
    operation.conversationId === snapshot.conversationId &&
    snapshot.artifacts.some((item) => item.id === operation.draftId && item.status === "completed")
  );
}

export function isDefiniteConfirmationRejection(status: number | undefined): boolean {
  return status === 400 || status === 409 || status === 422;
}
