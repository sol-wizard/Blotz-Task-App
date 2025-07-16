import { useAuth } from "@/contexts/AuthContext";
import { generateAiTask } from "@/services/ai-service";
import { TaskDetailDTO } from "@/src/components/single-task";
import TaskSelection from "@/src/components/task-selection";
import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Button } from "react-native";
import * as SecureStore from "expo-secure-store";
import { AUTH_TOKEN_KEY } from "@/src/util/token-key";

export default function Generate() {
  const { logout } = useAuth();
  const [text, setText] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [tasks, setTasks] = useState<TaskDetailDTO[]>([]);
  const [showTasks, setShowTasks] = useState(false);

  const handleGenerateTasksFromPrompt = async (prompt: string) => {
    if (!prompt.trim()) return;

    setAiMessage("");
    setTasks([]);

    try {
      const aiResponse = await generateAiTask(prompt);
      setAiMessage(aiResponse.message);
      setTasks(aiResponse.tasks);
    } catch (error) {
      console.error("Failed to generate task:", error);
    }

    setShowTasks(true);
  };

  useEffect(() => {
    const checkToken = async () => {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    };

    checkToken();
  }, []);

  return (
    <View className="flex-1 justify-center items-center p-6">
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        Generate Tasks with AI
      </Text>

      <Text className="text-gray-500 mb-4">
        Talk to AI to generate your next task.
      </Text>

      <TextInput
        className="border-2 border-gray-400 rounded-lg p-2 w-64"
        onChangeText={setText}
        value={text}
        placeholder="Type your task idea..."
      />

      <Pressable
        onPress={() => handleGenerateTasksFromPrompt(text)}
        className="bg-blue-500 p-2 rounded-lg mt-4"
      >
        <Text className="text-white">Submit</Text>
      </Pressable>

      {showTasks && <TaskSelection tasks={tasks} aiMessage={aiMessage} />}

      <Pressable
        onPress={logout}
        style={{
          marginTop: 32,
          padding: 10,
          backgroundColor: "#e0e0e0",
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "#333", textAlign: "center" }}>Sign Out</Text>
      </Pressable>
    </View>
  );
}
