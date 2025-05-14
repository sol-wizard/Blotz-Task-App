import * as signalR from '@microsoft/signalr';

let connection: signalR.HubConnection | null = null;

export const signalRService = {
  createConnection: (hubUrl: string): signalR.HubConnection => {
    connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build();

    return connection;
  },

  startConnection: async () => {
    if (!connection) throw new Error('Connection not created.');
    await connection.start();
  },

  stopConnection: async () => {
    if (connection) await connection.stop();
  },

  getConnection: (): signalR.HubConnection | null => connection,

  invoke: async <T = unknown>(method: string, ...args: unknown[]): Promise<T> => {
    if (!connection) throw new Error('Connection not initialized.');
    return connection.invoke<T>(method, ...args);
  },

  on: (method: string, callback: (...args: unknown[]) => void) => {
    if (connection) connection.on(method, callback);
  },

  off: (method: string, callback: (...args: unknown[]) => void) => {
    if (connection) connection.off(method, callback);
  },
};
