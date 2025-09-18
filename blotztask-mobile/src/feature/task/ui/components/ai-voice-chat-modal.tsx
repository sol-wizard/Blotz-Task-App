import { useVoiceInput } from "@/shared/util/useVoiceInput";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AiGeneratedTasks } from "./ai-generated-tasks";
import { useAiTaskGenerator } from "@/feature/ai-chat-hub/hooks/useAiTaskGenerator";
import { TaskCreateSuccessDialog } from "./task-create-success-dialog";
import { AiVoiceInput } from "./ai-voice-input";

export const AiVoiceChatModal = () => {
  const [showTaskList, setShowTaskList] = useState(false);

  const [showTaskCreateSuccessUI, setShowTaskCreateSuccessUI] = useState(false);

  const handleSuccessDialogToInput = () => {
    setShowTaskCreateSuccessUI(false);
    setShowTaskList(false);
  };
  return (
    <View className="w-[86%] rounded-3xl bg-white p-6 items-center">
      {!showTaskCreateSuccessUI && (
        <AiVoiceInput
          showTaskList={showTaskList}
          setShowTaskList={setShowTaskList}
          setShowConfirmUI={setShowTaskCreateSuccessUI}
        />
      )}
      {showTaskCreateSuccessUI && (
        <TaskCreateSuccessDialog handleBackToInput={handleSuccessDialogToInput} />
      )}
    </View>
  );
};
