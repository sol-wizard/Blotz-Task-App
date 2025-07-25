import { signalRService } from "@/services/signalr-service";
import signalR from "@microsoft/signalr";
import { FC, useEffect, useState } from "react";
import { View, Text, StyleSheet, Button } from "react-native";

// Define interface for message type (kept for completeness, though not used in simplified App)
const receiveMessageHandler = (msg:string) => {
  console.log('[SignalR] Received message:', msg);
};

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
        newConnection.on('ReceiveMessage', receiveMessageHandler);
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
          .then(() => {console.log('SignalR Connection Stopped.')
            newConnection.off('ReceiveMessage', receiveMessageHandler);
          })
          .catch((error: any) => console.error('Error stopping SignalR connection:', error)); // Type for error
      }
    };
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

  // New function to manually invoke a test method
  const sendTestMessage = async (): Promise<void> => {
    if (connection) {
      try {
        console.log("test sending messages")
        await signalRService.invoke(connection, 'SendMessage',  'Hello from React Native!');
        console.log('Invoked SendMessage on hub.');
      } catch (error: any) {
        console.error('Error invoking SendMessage:', error);
      }
    } else {
      console.warn('Cannot send test message: Not connected.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>SignalR Connection Test</Text>
      <Text style={styles.status}>Status: {connectionStatus}</Text>
      <Button
        title="Send Test Message"
        onPress={sendTestMessage}
        disabled={connectionStatus !== 'Connected'}
      />
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
