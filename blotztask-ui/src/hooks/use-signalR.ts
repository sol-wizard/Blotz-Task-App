import { useState, useEffect, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';

interface UseSignalRResult {
  connection: signalR.HubConnection | null;
  connectionState: string;
  invoke: <T = unknown>(methodName: string, ...args: unknown[]) => Promise<T>;
  on: (methodName: string, callback: (...args: unknown[]) => void) => void;
  off: (methodName: string, callback: (...args: unknown[]) => void) => void;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  error: Error | null;
}

/**
 * React hook for managing a SignalR connection
 * @param hubUrl The URL of the SignalR hub
 * @param autoConnect Whether to automatically connect when the component mounts
 * @returns An object with connection methods and state
 */
export function useSignalR(hubUrl: string, autoConnect = true): UseSignalRResult {
  const [connectionState, setConnectionState] = useState<string>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  // Create the connection instance
  useEffect(() => {
    connectionRef.current = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build();

    // Update state when connection state changes
    const onStateChange = () => {
      if (connectionRef.current) {
        setConnectionState(connectionRef.current.state);
      }
    };

    const connection = connectionRef.current;
    connection.onclose(onStateChange);
    connection.onreconnecting(() => {
      onStateChange();
      setError(new Error('Connection lost, trying to reconnect...'));
    });
    connection.onreconnected(onStateChange);

    return () => {
      // Clean up the connection when the component unmounts
      if (connection) {
        connection.stop().catch(console.error);
        connectionRef.current = null;
      }
    };
  }, [hubUrl]);

  // Start the connection
  useEffect(() => {
    if (autoConnect && connectionRef.current) {
      start();
    }
  }, [autoConnect, hubUrl]);

  // Start connection
  const start = useCallback(async () => {
    if (!connectionRef.current) return;

    try {
      setError(null);
      await connectionRef.current.start();
      setConnectionState(connectionRef.current.state);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setConnectionState('disconnected');
      throw err;
    }
  }, []);

  // Stop connection
  const stop = useCallback(async () => {
    if (!connectionRef.current) return;

    try {
      await connectionRef.current.stop();
      setConnectionState('disconnected');
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, []);

  // Invoke a hub method
  const invoke = useCallback(async <T = unknown>(methodName: string, ...args: unknown[]): Promise<T> => {
    if (!connectionRef.current) {
      throw new Error('No active connection!');
    }
    
    try {
      return await connectionRef.current.invoke<T>(methodName, ...args);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, []);

  // Register a handler for a hub event
  const on = useCallback((methodName: string, callback: (...args: unknown[]) => void) => {
    if (connectionRef.current) {
      connectionRef.current.on(methodName, callback);
    }
  }, []);

  // Remove a handler for a hub event
  const off = useCallback((methodName: string, callback: (...args: unknown[]) => void) => {
    if (connectionRef.current) {
      connectionRef.current.off(methodName, callback);
    }
  }, []);

  return {
    connection: connectionRef.current,
    connectionState,
    invoke,
    on,
    off,
    start,
    stop,
    error
  };
}