import { useState, useEffect, useCallback } from 'react';
import { signalRService } from '@/services/signalr-service';
import * as signalR from '@microsoft/signalr';

interface UseSignalRResult {
  connection: signalR.HubConnection | null;
  connectionState: string;
  invoke: <T = unknown>(methodName: string, ...args: unknown[]) => Promise<T>;
  on: (methodName: string, callback: (...args: unknown[]) => void) => void;
  off: (methodName: string, callback: (...args: unknown[]) => void) => void;
  start: () => Promise<void>; // Start the connection
  stop: () => Promise<void>; // Stop the connection
  error: Error | null; // Any error encountered
}

// The custom React hook for SignalR
export function useSignalR(hubUrl: string): UseSignalRResult {
  const [connectionState, setConnectionState] = useState('disconnected'); // Track connection state
  const [error, setError] = useState<Error | null>(null); // Track errors

  // Effect to create and configure the connection when hubUrl changes
  useEffect(() => {
    const conn = signalRService.createConnection(hubUrl);

    const onStateChange = () => setConnectionState(conn.state);

    conn.onclose(onStateChange);
    conn.onreconnecting(() => {
      onStateChange();
      setError(new Error('Connection lost, trying to reconnect...'));
    });
    conn.onreconnected(onStateChange);

    return () => {
      signalRService.stopConnection().catch(console.error);
    };
  }, [hubUrl]);

  const start = useCallback(async () => {
    try {
      setError(null);
      await signalRService.startConnection();
      const conn = signalRService.getConnection();
      if (conn) setConnectionState(conn.state);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setConnectionState('disconnected');
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      await signalRService.stopConnection();
      setConnectionState('disconnected');
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  return {
    connection: signalRService.getConnection(),
    connectionState,
    invoke: signalRService.invoke,
    on: signalRService.on,
    off: signalRService.off,
    start,
    stop,
    error,
  };
}
