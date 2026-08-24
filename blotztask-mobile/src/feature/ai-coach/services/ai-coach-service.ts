import { apiClient } from "@/shared/services/api/client";
import {
  ConfirmDraftRequestDto,
  ConfirmDraftResultDto,
  ConversationSnapshotDto,
} from "../models/ai-coach-dto";

function deviceTimeZoneId(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export async function startConversation(): Promise<ConversationSnapshotDto> {
  return apiClient.post("/ai-coach/conversations", { timeZoneId: deviceTimeZoneId() });
}

export async function fetchSnapshot(conversationId: string): Promise<ConversationSnapshotDto> {
  return apiClient.get(`/ai-coach/conversations/${conversationId}`);
}

export async function sendMessage(
  conversationId: string,
  content: string,
  expectedVersion: number,
  messageId: string,
): Promise<ConversationSnapshotDto> {
  return apiClient.post(`/ai-coach/conversations/${conversationId}/messages`, {
    messageId,
    content,
    expectedVersion,
  });
}

export async function confirmDraft(
  conversationId: string,
  draftId: string,
  request: ConfirmDraftRequestDto,
): Promise<ConfirmDraftResultDto> {
  return apiClient.post(
    `/ai-coach/conversations/${conversationId}/drafts/${draftId}/confirm`,
    request,
  );
}

/**
 * Voice input: upload a recording, get the transcript back. The text goes into the input
 * box for the user to review/edit — it is never auto-sent to the model.
 */
export async function transcribeAudio(uri: string): Promise<string> {
  const form = new FormData();
  // React Native FormData accepts a {uri,name,type} file descriptor; the DOM typings don't
  // know that shape, hence the cast.
  form.append("audio", { uri, name: "audio.m4a", type: "audio/mp4" } as unknown as Blob);
  const result = await apiClient.post<{ text: string }>("/ai-coach/transcribe", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return result.text;
}

export async function rejectDraft(
  conversationId: string,
  draftId: string,
  commandId: string,
  expectedConversationVersion: number,
): Promise<ConversationSnapshotDto> {
  return apiClient.post(`/ai-coach/conversations/${conversationId}/drafts/${draftId}/reject`, {
    commandId,
    expectedConversationVersion,
  });
}
