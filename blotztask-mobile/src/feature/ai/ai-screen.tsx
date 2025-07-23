import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";
import { TaskDetailDTO } from "../task/components/single-task";
import { generateAiTask } from "../../../services/ai-service";
import { AUTH_TOKEN_KEY } from "../../util/token-key";
import TaskSelection from "../task/components/task-selection";

export default function AIScreen() {
  const [text, setText] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [tasks, setTasks] = useState<TaskDetailDTO[]>([]);
  const [showTasks, setShowTasks] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateTasksFromPrompt = async (prompt: string) => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setAiMessage("");
    setTasks([]);

    try {
      const aiResponse = await generateAiTask(prompt);
      setAiMessage(aiResponse.message);
      setTasks(aiResponse.tasks);
      setShowTasks(true);
    } catch (error) {
      console.error("Failed to generate task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkToken = async () => {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    };

    checkToken();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>✨ AI Task Generator</Text>
        <Text style={styles.subtitle}>
          Describe what you want to accomplish and let AI create organized tasks for you
        </Text>
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>What would you like to work on?</Text>
        <TextInput
          style={styles.textInput}
          onChangeText={setText}
          value={text}
          placeholder="e.g., Plan a birthday party, Learn React Native, Organize my workspace..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Pressable
          onPress={() => handleGenerateTasksFromPrompt(text)}
          style={[styles.submitButton, (!text.trim() || isLoading) && styles.submitButtonDisabled]}
          disabled={!text.trim() || isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? "🤖 Generating..." : "🚀 Generate Tasks"}
          </Text>
        </Pressable>
      </View>

      {showTasks && (
        <View style={styles.resultsSection}>
          <TaskSelection tasks={tasks} aiMessage={aiMessage} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  inputSection: {
    marginBottom: 24,
    width: "100%",
    maxWidth: 400,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
    textAlign: "center",
  },
  textInput: {
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
    color: "#1F2937",
    marginBottom: 20,
    minHeight: 100,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  submitButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0.1,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  resultsSection: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    width: "100%",
    maxWidth: 400,
  },
});
