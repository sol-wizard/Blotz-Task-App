import * as signalR from "@microsoft/signalr";
import * as SecureStore from "expo-secure-store";
import { AUTH_TOKEN_KEY } from "@/shared/constants/token-key";
import AsyncStorage from "@react-native-async-storage/async-storage";
import uuid from "react-native-uuid";

const config = {
  API_BASE_URL: process.env.EXPO_PUBLIC_URL,
};
const SIGNALR_HUBS_CHAT = `${config.API_BASE_URL}/ai-task-generate-chathub`;
export const CONVERSATION_ID_KEY = "ACTIVE_CONVERSATION_ID";

export const signalRService = {
  createConversationId: async () => {
    const newConversationId = uuid.v4().toString();
    await AsyncStorage.setItem(CONVERSATION_ID_KEY, newConversationId);
    return newConversationId;
  },

  createConnection: async () => {
    console.log("Attempting to create SignalR connection to:", SIGNALR_HUBS_CHAT);
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    const conversationId = await signalRService.createConversationId();
    // TODO: Add error handling
    if (!token) {
      throw new Error("No token found in SecureStore.");
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const url =
      `${SIGNALR_HUBS_CHAT}` +
      `?timeZone=${encodeURIComponent(timeZone)}` +
      `&conversationId=${encodeURIComponent(conversationId)}`;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();
    return connection;
  },

  invoke: async <T = unknown>(
    connection: signalR.HubConnection,
    method: string,
    ...args: unknown[]
  ): Promise<T> => {
    if (!connection) throw new Error("Connection not initialized.");
    return connection.invoke<T>(method, ...args);
  },
};
