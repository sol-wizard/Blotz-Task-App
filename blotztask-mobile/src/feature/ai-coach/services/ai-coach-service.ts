import { AxiosRequestConfig } from "axios";
import { apiClient } from "@/shared/services/api/client";
import {
  AvailableAiCoachMode,
  EditDraftRequestDto,
  ConfirmDraftRequestDto,
  ConfirmDraftResultDto,
  ConversationSnapshotDto,
  AiCoachRating,
  MessageFeedbackDto,
  ChatTimelinePageDto,
} from "../models/ai-coach-dto";

// Keep protocol negotiation local to AI Coach, including reads and history pagination.
const protocol = { headers: { "X-Ai-Coach-Protocol": "6" } };
const coachClient = {
  get: <T>(url: string, config: AxiosRequestConfig = {}) => apiClient.get<T>(url, { ...config, headers: { ...config.headers, ...protocol.headers } }),
  post: <T>(url: string, data?: unknown, config: AxiosRequestConfig = {}) => apiClient.post<T>(url, data, { ...config, headers: { ...config.headers, ...protocol.headers } }),
  put: <T>(url: string, data?: unknown) => apiClient.put<T>(url, data, protocol),
  delete: <T>(url: string) => apiClient.delete<T>(url, protocol),
};

function deviceTimeZoneId(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export async function openChat(): Promise<ConversationSnapshotDto> {
  return coachClient.get("/ai-coach/chat", { params: { timeZoneId: deviceTimeZoneId() } });
}
export async function fetchMessages(before: string | null, signal?: AbortSignal): Promise<ChatTimelinePageDto> {
  return coachClient.get("/ai-coach/chat/messages", { params: { before: before ?? undefined, limit: 30 }, signal });
}
export async function newTopic(): Promise<ConversationSnapshotDto> {
  return coachClient.post("/ai-coach/chat/topics", { timeZoneId: deviceTimeZoneId() });
}
export async function clearChat(): Promise<void> {
  return coachClient.delete("/ai-coach/chat");
}

export async function startConversation(
  mode: AvailableAiCoachMode = "Execution",
): Promise<ConversationSnapshotDto> {
  return coachClient.post("/ai-coach/conversations", {
    timeZoneId: deviceTimeZoneId(),
    mode,
  });
}

export async function fetchSnapshot(conversationId: string): Promise<ConversationSnapshotDto> {
  return coachClient.get(`/ai-coach/conversations/${conversationId}`);
}

export async function getMessageFeedback(conversationId: string): Promise<MessageFeedbackDto[]> {
  return coachClient.get(`/ai-coach/conversations/${conversationId}/message-feedback`);
}

export async function putMessageFeedback(conversationId: string, messageId: string,
  rating: AiCoachRating, reason: string | null = null, detail: string | null = null,
): Promise<MessageFeedbackDto> {
  return coachClient.put(`/ai-coach/conversations/${conversationId}/messages/${messageId}/feedback`, {
    rating, reason, detail,
  });
}

export async function deleteMessageFeedback(conversationId: string, messageId: string): Promise<void> {
  return coachClient.delete(`/ai-coach/conversations/${conversationId}/messages/${messageId}/feedback`);
}

export async function sendMessage(
  conversationId: string,
  content: string,
  expectedVersion: number,
  messageId: string,
): Promise<ConversationSnapshotDto> {
  return coachClient.post(`/ai-coach/conversations/${conversationId}/messages`, {
    messageId,
    content,
    expectedVersion,
    timeZoneId: deviceTimeZoneId(),
  });
}

export async function confirmDraft(
  conversationId: string,
  draftId: string,
  request: ConfirmDraftRequestDto,
): Promise<ConfirmDraftResultDto> {
  return coachClient.post(
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
  const result = await coachClient.post<{ text: string }>("/ai-coach/transcribe", form, {
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
  return coachClient.post(`/ai-coach/conversations/${conversationId}/drafts/${draftId}/reject`, {
    commandId,
    expectedConversationVersion,
  });
}

export async function editDraft(
  conversationId: string,
  draftId: string,
  request: EditDraftRequestDto,
): Promise<ConversationSnapshotDto> {
  return coachClient.put(`/ai-coach/conversations/${conversationId}/drafts/${draftId}`, request);
}
