import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import TaskSelection from "@/feature/ai/components/task-selection";
import { generateAiTask } from "../services/ai-service";
import { TaskDetailDTO } from "../models/tasks";
import { router } from "expo-router";

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

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ alignItems: "center", paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mt-10 mb-8 px-4">
          <Text className="text-2xl font-bold text-gray-800 mb-2 text-center">
            ✨ AI Task Generator
          </Text>
          <Text className="text-base text-gray-500 text-center leading-6">
            Describe what you want to accomplish and let AI create organized
            tasks for you
          </Text>
        </View>

        <View className="w-full max-w-md px-4">
          <Text className="text-lg font-semibold text-gray-700 mb-3 text-center">
            What would you like to work on?
          </Text>

          <TextInput
            className="border-2 border-gray-200 rounded-xl p-4 text-base bg-white text-gray-800 mb-4 min-h-[100px]"
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
            className={`rounded-xl px-6 py-4 mb-3 shadow ${
              !text.trim() || isLoading
                ? "bg-gray-400"
                : "bg-blue-500 active:bg-blue-600"
            }`}
            disabled={!text.trim() || isLoading}
          >
            <Text className="text-white text-lg font-semibold text-center">
              {isLoading ? "🤖 Generating..." : "🚀 Generate Tasks"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/chatScreen" as any)}
            className="bg-blue-600 px-4 py-2 mt-2 rounded-lg active:bg-blue-700"
          >
            <Text className="text-white font-semibold text-base text-center">
              Go to chat screen
            </Text>
          </Pressable>
        </View>

        {showTasks && (
          <View className="mt-6 bg-white rounded-xl p-4 shadow w-full max-w-md">
            <TaskSelection tasks={tasks} aiMessage={aiMessage} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
