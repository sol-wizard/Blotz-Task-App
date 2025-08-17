import React from "react";
import { View, Text } from "react-native";
import { SubTask } from "../models/subtask";

interface BreakdownBotMessageProps {
  text: string;
  subtasks?: SubTask[];
}

export default function BreakdownBotMessage({ text, subtasks }: BreakdownBotMessageProps) {
  return (
    <View className="mb-4">
      <View className="bg-gray-100 p-3 rounded-lg mr-12">
        <Text className="text-gray-800">{text}</Text>
        
        {subtasks && subtasks.length > 0 && (
          <View className="mt-3">
            <Text className="font-semibold text-gray-700 mb-2">Subtasks:</Text>
            {subtasks.map((subtask, index) => (
              <View key={index} className="bg-white p-2 mb-2 rounded border border-gray-200">
                <Text className="font-medium text-gray-800">{subtask.title}</Text>
                <Text className="text-sm text-gray-500 mt-1">Duration: {subtask.duration}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
