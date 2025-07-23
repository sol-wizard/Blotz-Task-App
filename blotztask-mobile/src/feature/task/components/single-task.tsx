import { View, Text, StyleSheet } from "react-native";

export interface TaskDetailDTO {
  id: number;
  description: string;
  title: string;
  dueDate: Date;
}

interface SingleTaskProps {
  task: TaskDetailDTO;
}

export const SingleTask = ({ task }: SingleTaskProps) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{task.title}</Text>
      <Text style={styles.description}>{task.description}</Text>
      <Text style={styles.dueDate}>📅 Due: {task.dueDate.toDateString()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderColor: "#e0e0e0",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // for Android
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937", // gray-800
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#4b5563", // gray-600
    marginBottom: 8,
  },
  dueDate: {
    fontSize: 13,
    color: "#3b82f6", // blue-500
  },
});
