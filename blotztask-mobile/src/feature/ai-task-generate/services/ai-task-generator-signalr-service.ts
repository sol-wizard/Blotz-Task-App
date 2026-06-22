import * as signalR from "@microsoft/signalr";
import { getAuthToken } from "@/shared/services/api/token-manager";

const config = {
  API_BASE_URL: process.env.EXPO_PUBLIC_URL,
};
const SIGNALR_HUBS_CHAT = `${config.API_BASE_URL}/ai-task-generate-chathub`;

export const signalRService = {
  createConnection: async () => {
    console.log("Attempting to create SignalR connection to:", SIGNALR_HUBS_CHAT);

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const url = `${SIGNALR_HUBS_CHAT}?timeZone=${encodeURIComponent(timeZone)}`;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: async () => {
          const token = await getAuthToken();
          if (!token) {
            throw new Error("No valid Auth0 credentials available.");
          }
          return token;
        },
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
