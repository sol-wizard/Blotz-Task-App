import { useEffect, useRef, useState, type ReactNode } from "react";
import { Platform, Pressable, Image, View } from "react-native";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { renderBottomSheetBackdrop } from "@/shared/components/ui/render-bottomsheet-backdrop";
import { GradientCircle } from "@/shared/components/common/gradient-circle";
import { AiTasksPreview } from "./component/ai-tasks-preview";
import { AiInput } from "./component/ai-input";
import { TaskAddedSuccess } from "./component/task-added-success";
import { ASSETS } from "@/shared/constants/assets";
import { mapExtractedTaskDTOToAiTaskDTO } from "./utils/map-extracted-to-task-dto";
import { useAiTaskGenerator } from "./hooks/useAiTaskGenerator";
import { useAllLabels } from "@/shared/hooks/useAllLabels";
import { usePostHog } from "posthog-react-native";
import { BottomSheetType } from "./models/bottom-sheet-type";

export const ToggleAiTaskGenerate = () => {
  const aiVoiceInputModalRef = useRef<BottomSheetModal>(null);

  const [modalType, setModalType] = useState<BottomSheetType>("input");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const { aiGeneratedMessage, sendMessage, inputError, setInputError, connect, disconnect } =
    useAiTaskGenerator({
      setIsAiGenerating,
      setModalType,
    });
  const [text, setText] = useState("");
  const [isVoiceInput, setIsVoiceInput] = useState(true);
  const { labels, isLoading } = useAllLabels();
  const posthog = usePostHog();

  const openModal = async () => {
    await connect();
    aiVoiceInputModalRef.current?.present();
  };

  const resetModal = () => {
    setModalType("input");
    setText("");
    setInputError(false);
    disconnect();
  };

  useEffect(() => {
    if (!inputError) {
      posthog.capture("ai_task_interaction_completed", {
        ai_output: JSON.stringify(aiGeneratedMessage),
        user_input: text,
        ai_generate_task_count: 0,
        user_add_task_count: 0,
        outcome: "error",
        is_voice_input: isVoiceInput,
      });
    }
  }, [inputError]);

  const aiGeneratedTasks = aiGeneratedMessage?.extractedTasks.map((task) =>
    mapExtractedTaskDTOToAiTaskDTO(task, labels ?? []),
  );
  const modalBackgroundColor = modalType === "add-task-success" ? "#F5F9FA" : "#FFFFFF";

  let modalContent: ReactNode;

  switch (modalType) {
    case "task-preview":
      modalContent = (
        <AiTasksPreview
          aiTasks={aiGeneratedTasks}
          userInput={text}
          setModalType={setModalType}
          isVoiceInput={isVoiceInput}
          sheetRef={aiVoiceInputModalRef}
        />
      );
      break;
    case "add-task-success":
      modalContent = (
        <View className="flex-1 w-full bg-[#F5F9FA]">
          <TaskAddedSuccess />
        </View>
      );
      break;
    case "input":
    default:
      modalContent = (
        <AiInput
          text={text}
          setText={setText}
          generateTaskError={inputError}
          setInputError={setInputError}
          sendMessage={sendMessage}
          isVoiceInput={isVoiceInput}
          setIsVoiceInput={setIsVoiceInput}
          sheetRef={aiVoiceInputModalRef}
          errorMessage={aiGeneratedMessage?.errorMessage}
          isAiGenerating={isAiGenerating || isLoading}
        />
      );
  }

  return (
    <>
      <Pressable onPress={openModal}>
        <GradientCircle size={58}>
          <Image
            source={ASSETS.whiteBun}
            resizeMode="contain"
            style={[{ width: 28, height: 28, position: "absolute" }]}
          />
        </GradientCircle>
      </Pressable>

      <BottomSheetModal
        ref={aiVoiceInputModalRef}
        backdropComponent={renderBottomSheetBackdrop}
        backgroundStyle={{
          backgroundColor: modalBackgroundColor,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        onDismiss={resetModal}
        snapPoints={["70%"]}
        keyboardBehavior={Platform.OS === "ios" ? "extend" : "interactive"}
        keyboardBlurBehavior="restore"
        enableContentPanningGesture={false}
        enableHandlePanningGesture={true}
        enablePanDownToClose={false}
      >
        <BottomSheetView className="justify-between items-center" style={{ minHeight: 300 }}>
          {modalContent}
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
};
