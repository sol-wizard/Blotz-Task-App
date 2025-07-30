import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { signalRService } from "../../../services/signalr-service";

export function useSignalRChat(onReceive: (message: string) => void) {
  const [status, setStatus] = useState<
    "Disconnected" | "Connected" | "Reconnecting" | string
  >("Disconnected");
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    const connection = signalRService.createConnection();
    connectionRef.current = connection;

    connection.onclose(() => setStatus("Disconnected"));
    connection.onreconnecting(() => setStatus("Reconnecting"));
    connection.onreconnected(() => setStatus("Connected"));

    connection.on("ReceiveMessage", onReceive);

    connection
      .start()
      .then(() => {
        setStatus("Connected");
        console.log("[SignalR] Connected");
      })
      .catch((err) => {
        console.error("[SignalR] Connection error:", err);
        setStatus("Error: " + err.message);
      });

    return () => {
      connection.stop().then(() => {
        connection.off("ReceiveMessage", onReceive);
        console.log("[SignalR] Disconnected");
      });
    };
  }, [onReceive]);

  const sendMessage = async (message: string) => {
    if (connectionRef.current && status === "Connected") {
      try {
        await signalRService.invoke(
          connectionRef.current,
          "SendMessage",
          message
        );
        console.log("[SignalR] Sent message:", message);
      } catch (err) {
        console.error("[SignalR] Send failed:", err);
      }
    }
  };

  return { status, sendMessage };
}
