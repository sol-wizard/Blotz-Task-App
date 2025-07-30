import { usePushNotificationSetup } from "@/hooks/usePushNotificationSetup";
import { schedulePushNotification } from "@/services/notifications";
import { Text, View, Button, StyleSheet } from "react-native";

export default function NotificationPage() {
  const { notification } = usePushNotificationSetup();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📬 Push Notification Tester</Text>

      <View style={styles.buttonContainer}>
        <Button
          title="Trigger Remote Notification"
          onPress={async () => {
            await schedulePushNotification();
          }}
          color="#4f46e5"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔔 Latest Notification</Text>
        <Text style={styles.label}>
          Title:{" "}
          <Text style={styles.value}>
            {notification?.request?.content?.title ?? "None"}
          </Text>
        </Text>
        <Text style={styles.label}>
          Body:{" "}
          <Text style={styles.value}>
            {notification?.request?.content?.body ?? "None"}
          </Text>
        </Text>
        <Text style={styles.label}>
          Data:{" "}
          <Text style={styles.value}>
            {notification
              ? JSON.stringify(notification.request.content.data)
              : "None"}
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24,
    color: "#1e293b",
  },
  buttonContainer: {
    marginBottom: 32,
    alignSelf: "center",
    width: "80%",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
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
