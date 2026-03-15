import React, { useState } from "react";
import { BottomSheetType } from "../models/bottom-sheet-type";
import { useAiTaskGenerator } from "../hooks/useAiTaskGenerator";
import { useAllLabels } from "@/shared/hooks/useAllLabels";
import { mapExtractedTaskDTOToAiTaskDTO } from "../utils/map-extracted-to-task-dto";
import { mapExtractedNoteDTOToAiNoteDTO } from "../utils/map-extracted-to-note-dto";
import { AiTasksPreview } from "./ai-tasks-preview";
import { SpeechInput } from "./speech-input";

export const AiModalContent = ({
  modalType,
  setModalType,
}: {
  modalType: BottomSheetType;
  setModalType: (type: BottomSheetType) => void;
}) => {
  const [text, setText] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const { aiGeneratedMessage, sendMessage, setAiGeneratedMessage } = useAiTaskGenerator({
    setIsAiGenerating,
    setModalType,
  });

  const { labels } = useAllLabels();

  const aiGeneratedTasks = (aiGeneratedMessage?.extractedTasks ?? []).flatMap((task) => {
    try {
      return [mapExtractedTaskDTOToAiTaskDTO(task, labels ?? [])];
    } catch (e) {
      console.warn("Skipping task with invalid date:", e);
      return [];
    }
  });

  const aiGeneratedNotes = (aiGeneratedMessage?.extractedNotes ?? []).map(mapExtractedNoteDTOToAiNoteDTO);

  switch (modalType) {
    case "task-preview":
      return (
        <AiTasksPreview
          aiTasks={aiGeneratedTasks}
          aiNotes={aiGeneratedNotes}
          userInput={text}
          setModalType={setModalType}
          setAiGeneratedMessage={setAiGeneratedMessage}
        />
      );

    case "input":
    default:
      return (
        <SpeechInput
          text={text}
          setText={setText}
          sendMessage={sendMessage}
          isAiGenerating={isAiGenerating}
          aiGeneratedMessage={aiGeneratedMessage}
        />
      );
  }
};
