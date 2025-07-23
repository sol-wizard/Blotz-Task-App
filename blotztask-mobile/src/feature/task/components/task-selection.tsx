import { View, Text, StyleSheet } from "react-native";
import { SingleTask, TaskDetailDTO } from "./single-task";

export default function TaskSelection({
  tasks,
  aiMessage,
}: {
  tasks: TaskDetailDTO[];
  aiMessage: string;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>✅ Tasks Generated</Text>

      {aiMessage ? <Text style={styles.aiMessage}>{aiMessage}</Text> : null}

      {tasks && tasks.length > 0 ? (
        tasks.map((task) => <SingleTask key={task.id} task={task} />)
      ) : (
        <Text style={styles.emptyText}>No tasks generated yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    width: "100%",
    backgroundColor: "#f9fafb", // gray-50
    borderRadius: 12,
    marginTop: 24,
  },
  heading: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
    color: "#111827", // gray-900
    textAlign: "center",
  },
  aiMessage: {
    fontSize: 14,
    color: "#5a5e63", // blue-500
    marginBottom: 16,
    textAlign: "left",
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280", // gray-500
    textAlign: "center",
    marginTop: 8,
  },
});
