import { signalRService } from "@/services/signalr-service";
import { FC, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";

// --- Example React Native Component Usage ---
const App: FC = () => { // Added FC type for App component
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null); // Type for connection state
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected'); // Type for connectionStatus state

  useEffect(() => {
    // 1. Create the connection
    const newConnection: signalR.HubConnection = signalRService.createConnection(); // Explicit type
    setConnection(newConnection);

    // Handle connection state changes for UI feedback
    newConnection.onclose(() => setConnectionStatus('Disconnected'));
    newConnection.onreconnecting(() => setConnectionStatus('Reconnecting...'));
    newConnection.onreconnected(() => setConnectionStatus('Connected'));

    // 2. Start the connection
    const startConnection = async (): Promise<void> => { // Explicit return type
      try {
        await newConnection.start();
        setConnectionStatus('Connected');
        console.log('Connected to SignalR hub!'); // Added success message
      } catch (error: any) { // Catch error as any or Error
        setConnectionStatus(`Error: ${(error as Error).message}`); // Type assertion for error
        console.error('Error connecting to SignalR:', error);
      }
    };

    startConnection();

    // 3. Clean up connection on component unmount
    return () => {
      if (newConnection) {
        newConnection.stop()
          .then(() => console.log('SignalR Connection Stopped.'))
          .catch((error: any) => console.error('Error stopping SignalR connection:', error)); // Type for error
      }
    };
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

  return (
    <View style={styles.container}>
      <Text style={styles.header}>SignalR Connection Test</Text>
      <Text style={styles.status}>Status: {connectionStatus}</Text>
      {/* Removed chat-related UI elements */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f2f5',
    paddingTop: 50, // Adjust for status bar on mobile
    alignItems: 'center', // Center content horizontally
    justifyContent: 'center', // Center content vertically
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  status: {
    fontSize: 18, // Slightly larger for emphasis
    marginBottom: 15,
    textAlign: 'center',
    color: '#555',
    fontWeight: '600',
  },
  // Removed styles related to messages and input
});

export default App;
