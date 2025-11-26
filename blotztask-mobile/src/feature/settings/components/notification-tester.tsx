import { usePushNotificationSetup } from "@/shared/hooks/usePushNotificationSetup";
import { schedulePushNotification } from "@/shared/services/notifications";
import { Text, View, StyleSheet } from "react-native";
import { Button } from "react-native-paper";

export default function NotificationTrigger() {
  const { notification } = usePushNotificationSetup();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📬 Push Notification Tester</Text>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={async () => {
            await schedulePushNotification();
          }}
          style={styles.testButton}
        >
          Trigger Remote Notification
        </Button>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔔 Latest Notification</Text>
        <Text style={styles.label}>
          Title: <Text style={styles.value}>{notification?.request?.content?.title ?? "None"}</Text>
        </Text>
        <Text style={styles.label}>
          Body: <Text style={styles.value}>{notification?.request?.content?.body ?? "None"}</Text>
        </Text>
        <Text style={styles.label}>
          Data:{" "}
          <Text style={styles.value}>
            {notification ? JSON.stringify(notification.request.content.data) : "None"}
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f8fafc",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
    color: "#1e293b",
  },
  buttonContainer: {
    marginBottom: 24,
    alignSelf: "center",
    width: "80%",
  },
  testButton: {
    backgroundColor: "#4f46e5",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#334155",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
    marginBottom: 4,
  },
  value: {
    fontWeight: "normal",
    color: "#1e293b",
  },
});
