import * as signalR from "@microsoft/signalr";
import * as SecureStore from "expo-secure-store";
import { AUTH_TOKEN_KEY } from "@/shared/constants/token-key";

const config = {
  API_BASE_URL: process.env.EXPO_PUBLIC_URL,
};
const SIGNALR_HUBS_CHAT = `${config.API_BASE_URL}/ai-task-generate-chathub`;

export const signalRService = {
  createConnection: async () => {
    console.log("Attempting to create SignalR connection to:", SIGNALR_HUBS_CHAT);
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    // TODO: Add error handling
    if (!token) {
      throw new Error("No token found in SecureStore.");
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const url = `${SIGNALR_HUBS_CHAT}?timeZone=${encodeURIComponent(timeZone)}`;

    console.log("timezone:", timeZone);

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
