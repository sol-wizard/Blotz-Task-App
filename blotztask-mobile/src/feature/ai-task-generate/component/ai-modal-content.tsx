import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import { BottomSheetType } from "../models/bottom-sheet-type";
import { useAiTaskGenerator } from "../hooks/useAiTaskGenerator";
import { useAllLabels } from "@/shared/hooks/useAllLabels";
import { mapExtractedTaskDTOToAiTaskDTO } from "../utils/map-extracted-to-task-dto";
import { AiTasksPreview } from "./ai-tasks-preview";
import { TaskAddedSuccess } from "./task-added-success";
import { WriteInput } from "./write-input";
import { AiInput } from "./ai-input";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";

export const AiModalContent = ({
  modalType,
  setModalType,
  language,
}: {
  modalType: BottomSheetType;
  setModalType: (type: BottomSheetType) => void;
  language: string;
}) => {
  const [text, setText] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const { aiGeneratedMessage, sendMessage, setAiGeneratedMessage } = useAiTaskGenerator({
    setIsAiGenerating,
    setModalType,
  });

  const { labels } = useAllLabels();

  const aiGeneratedTasks = useMemo(() => {
    return aiGeneratedMessage?.extractedTasks.map((task) =>
      mapExtractedTaskDTOToAiTaskDTO(task, labels ?? []),
    );
  }, [aiGeneratedMessage?.extractedTasks, labels]);

  switch (modalType) {
    case "task-preview":
      return (
        <AiTasksPreview
          aiTasks={aiGeneratedTasks}
          userInput={text}
          setModalType={setModalType}
          setAiGeneratedMessage={setAiGeneratedMessage}
        />
      );

    case "add-task-success":
      return <TaskAddedSuccess />;

    case "input":
    default:
      return ExpoSpeechRecognitionModule.isRecognitionAvailable() ? (
        <AiInput
          text={text}
          setText={setText}
          sendMessage={sendMessage}
          isAiGenerating={isAiGenerating}
          aiGeneratedMessage={aiGeneratedMessage}
          language={language}
        />
      ) : (
        <WriteInput
          text={text}
          setText={setText}
          sendMessage={sendMessage}
          isAiGenerating={isAiGenerating}
          aiGeneratedMessage={aiGeneratedMessage}
        />
      );
  }
};
