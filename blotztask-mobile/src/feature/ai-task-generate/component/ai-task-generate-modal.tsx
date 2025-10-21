import { useEffect, useState } from "react";
import { AiTasksPreview } from "./ai-tasks-preview";
import { AiInput } from "./ai-input";
import { AiThinkingModal } from "./ai-thinking-modal";
import { TaskAddedSuccess } from "./task-added-success";
import { useAiTaskGenerator } from "../hooks/useAiTaskGenerator";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

export const AiTaskGenerateModal = ({
  sheetRef,
}: {
  sheetRef: React.RefObject<BottomSheetModal | null>;
}) => {
  const [text, setText] = useState("");
  const [isVoiceInput, setIsVoiceInput] = useState(true);
  const { aiGeneratedMessage, sendMessage, modalType, setModalType, inputError, setInputError } =
    useAiTaskGenerator();
  useEffect(() => {
    if (!sheetRef.current) return;

    if (modalType === "input") {
      // 当需要用户输入时（包括初次输入和点击编辑按钮后），
      // 展开到 snapPoints 数组中索引为 1 的位置（通常是较大的高度）。
      sheetRef.current.snapToIndex(1);
    } else {
      // 对于所有其他情况 (loading, task-preview, add-task-success),
      // 都应该收缩到索引为 0 的位置（通常是较小的高度，用于展示信息）。
      sheetRef.current.snapToIndex(0);
    }
  }, [modalType, sheetRef]);

  switch (modalType) {
    case "task-preview":
      return (
        <AiTasksPreview
          aiMessage={aiGeneratedMessage}
          setUserInput={setText}
          userInput={text}
          setModalType={setModalType}
          isVoiceInput={isVoiceInput}
        />
      );

    case "loading":
      return <AiThinkingModal />;

    case "add-task-success":
      return <TaskAddedSuccess />;

    case "input":
    default:
      return (
        <AiInput
          text={text}
          setText={setText}
          generateTaskError={inputError}
          setInputError={setInputError}
          sendMessage={sendMessage}
          isVoiceInput={isVoiceInput}
          setIsVoiceInput={setIsVoiceInput}
          sheetRef={sheetRef}
          errorMessage={aiGeneratedMessage?.errorMessage}
        />
      );
  }
};
