import React, { useEffect, useState } from "react";
import { BottomSheetType } from "../models/bottom-sheet-type";
import { useAiTaskGenerator } from "../hooks/useAiTaskGenerator";
import { useAllLabels } from "@/shared/hooks/useAllLabels";
import { mapExtractedTaskDTOToAiTaskDTO } from "../utils/map-extracted-to-task-dto";
import { mapExtractedNoteDTOToAiNoteDTO } from "../utils/map-extracted-to-note-dto";
import { AiTasksPreview } from "./ai-tasks-preview";
import { AiInput } from "./ai-input";
import { AiVoiceInput } from "./ai-voice-input";
import { se } from "date-fns/locale";

export const AiModalContent = ({
  modalType,
  setModalType,
}: {
  modalType: BottomSheetType;
  setModalType: (type: BottomSheetType) => void;
}) => {
  const [text, setText] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const { aiGeneratedMessage, setAiGeneratedMessage, transcribeAudio, sendMessage } =
    useAiTaskGenerator({
      setIsAiGenerating,
      setModalType,
    });

  const { labels } = useAllLabels();

  const aiGeneratedTasks = (aiGeneratedMessage?.extractedTasks ?? []).map((task) =>
    mapExtractedTaskDTOToAiTaskDTO(task, labels ?? []),
  );
  const aiGeneratedNotes = (aiGeneratedMessage?.extractedNotes ?? []).map(
    mapExtractedNoteDTOToAiNoteDTO,
  );

  useEffect(() => {
    if (aiGeneratedMessage?.isSuccess && !isAiGenerating && modalType === "input") {
      setModalType("task-preview");
    }
  }, [isAiGenerating]);

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

    case "voice-input":
      return (
        <AiVoiceInput
          transcribeAudio={transcribeAudio}
          aiTasks={aiGeneratedTasks}
          aiNotes={aiGeneratedNotes}
          isAiGenerating={isAiGenerating}
        />
      );

    case "input":
    default:
      return (
        <AiInput
          text={text}
          setText={setText}
          isAiGenerating={isAiGenerating}
          aiGeneratedMessage={aiGeneratedMessage}
          setModalType={setModalType}
          onGenerateTask={async () => {
            await sendMessage(text);
            setModalType("task-preview");
          }}
        />
      );
  }
};
