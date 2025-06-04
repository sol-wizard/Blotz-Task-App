import * as signalR from '@microsoft/signalr';

const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const SIGNALR_HUBS_CHAT = `${apiUrl}/chatHub`;

export const signalRService = {
  createConnection: (): signalR.HubConnection => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_HUBS_CHAT)
      .withAutomaticReconnect()
      .build();

    return connection;
  },

  invoke: async <T = unknown>(connection: signalR.HubConnection, method: string, ...args: unknown[]): Promise<T> => {
    if (!connection) throw new Error('Connection not initialized.');
    return connection.invoke<T>(method, ...args);
  },
};
