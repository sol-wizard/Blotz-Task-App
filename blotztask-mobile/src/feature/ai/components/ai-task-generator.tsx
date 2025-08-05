import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
} from "react-native";
import TaskSelection from "./task-selection";
import { generateAiTask } from "../services/ai-service";
import { TaskDetailDTO } from "../models/tasks";
import { router } from "expo-router";

export default function AITaskGenerator() {
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

  return (
    <View style={{ backgroundColor: "#f9fafb", padding: 16, borderRadius: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold", color: "#374151", marginBottom: 8, textAlign: "center" }}>
        ✨ AI Task Generator
      </Text>
      <Text style={{ fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 16 }}>
        Describe what you want to accomplish and let AI create organized tasks for you
      </Text>

      <Text style={{ fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
        What would you like to work on?
      </Text>

      <TextInput
        style={{
          borderWidth: 1,
          borderColor: "#d1d5db",
          borderRadius: 12,
          padding: 12,
          fontSize: 16,
          backgroundColor: "#ffffff",
          color: "#374151",
          marginBottom: 12,
          minHeight: 80,
          textAlignVertical: "top",
        }}
        onChangeText={setText}
        value={text}
        placeholder="e.g., Plan a birthday party, Learn React Native, Organize my workspace..."
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={3}
      />

      <Pressable
        onPress={() => handleGenerateTasksFromPrompt(text)}
        style={{
          borderRadius: 12,
          paddingHorizontal: 24,
          paddingVertical: 12,
          marginBottom: 12,
          backgroundColor: !text.trim() || isLoading ? "#9CA3AF" : "#3B82F6",
        }}
        disabled={!text.trim() || isLoading}
      >
        <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "600", textAlign: "center" }}>
          {isLoading ? "Generating..." : "Generate Tasks"}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/(protected)/chat")}
        style={{
          backgroundColor: "#1D4ED8",
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 14, textAlign: "center" }}>
          Go to chat screen
        </Text>
      </Pressable>

      {showTasks && (
        <View style={{ marginTop: 16 }}>
          <TaskSelection tasks={tasks} aiMessage={aiMessage} />
        </View>
      )}
    </View>
  );
}