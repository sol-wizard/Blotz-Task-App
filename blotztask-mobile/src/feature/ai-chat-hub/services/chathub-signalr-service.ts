import * as signalR from "@microsoft/signalr";

const config = {
  API_BASE_URL: process.env.EXPO_PUBLIC_URL,
};

const SIGNALR_HUBS_CHAT = `${config.API_BASE_URL}/ai-task-generate-chathub`;

export const signalRService = {
  createConnection: () => {
    console.log(
      "Attempting to create SignalR connection to:",
      SIGNALR_HUBS_CHAT
    );
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_HUBS_CHAT)
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
