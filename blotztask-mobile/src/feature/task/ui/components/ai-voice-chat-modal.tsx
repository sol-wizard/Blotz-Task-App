import React, { useState } from "react";
import { View } from "react-native";
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
