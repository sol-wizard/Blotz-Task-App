import { signalRService } from "@/services/signalr-service";
import signalR from "@microsoft/signalr";
import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "react-native-paper";

// Define interface for message type
const receiveMessageHandler = (msg: string) => {
  console.log("[SignalR] Received message:", msg);
};

export default function SignalRConnectionTester() {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(
    null
  );
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Disconnected");

  useEffect(() => {
    // 1. Create the connection
    const newConnection: signalR.HubConnection =
      signalRService.createConnection();
    setConnection(newConnection);

    // Handle connection state changes for UI feedback
    newConnection.onclose(() => setConnectionStatus("Disconnected"));
    newConnection.onreconnecting(() => setConnectionStatus("Reconnecting..."));
    newConnection.onreconnected(() => setConnectionStatus("Connected"));

    // 2. Start the connection
    const startConnection = async (): Promise<void> => {
      try {
        await newConnection.start();
        setConnectionStatus("Connected");
        newConnection.on("ReceiveMessage", receiveMessageHandler);
        console.log("Connected to SignalR hub!");
      } catch (error: any) {
        setConnectionStatus(`Error: ${(error as Error).message}`);
        console.error("Error connecting to SignalR:", error);
      }
    };

    startConnection();

    // 3. Clean up connection on component unmount
    return () => {
      if (newConnection) {
        newConnection
          .stop()
          .then(() => {
            console.log("SignalR Connection Stopped.");
            newConnection.off("ReceiveMessage", receiveMessageHandler);
          })
          .catch((error: any) =>
            console.error("Error stopping SignalR connection:", error)
          );
      }
    };
  }, []);

  // Function to manually invoke a test method
  const sendTestMessage = async (): Promise<void> => {
    if (connection) {
      try {
        console.log("test sending messages");
        await signalRService.invoke(
          connection,
          "SendMessage",
          "Hello from React Native!"
        );
        console.log("Invoked SendMessage on hub.");
      } catch (error: any) {
        console.error("Error invoking SendMessage:", error);
      }
    } else {
      console.warn("Cannot send test message: Not connected.");
    }
  };

  const getStatusColor = (status: string) => {
    if (status === "Connected") return "#22c55e";
    if (status.includes("Error")) return "#ef4444";
    if (status === "Reconnecting...") return "#f59e0b";
    return "#6b7280";
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🔗 SignalR Connection Test</Text>
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Status:</Text>
        <Text style={[styles.status, { color: getStatusColor(connectionStatus) }]}>
          {connectionStatus}
        </Text>
      </View>
      <Button
        mode="contained"
        onPress={sendTestMessage}
        disabled={connectionStatus !== "Connected"}
        style={[
          styles.testButton,
          connectionStatus !== "Connected" && styles.disabledButton,
        ]}
      >
        Send Test Message
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: "#1e293b",
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 16,
    color: "#475569",
    marginRight: 8,
  },
  status: {
    fontSize: 16,
    fontWeight: "600",
  },
  testButton: {
    backgroundColor: "#4f46e5",
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
  },
});