import { renderBottomSheetBackdrop } from "@/shared/components/ui/render-bottomsheet-backdrop";
import { BottomSheetFooterProps, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useRef, useState } from "react";
import { FAB, Portal } from "react-native-paper";
import { AiTaskGenerateModal } from "./ai-task-generate-modal";
import { useVoiceInput } from "@/shared/util/useVoiceInput";
import { useAiTaskGenerator } from "@/feature/ai-chat-hub/hooks/useAiTaskGenerator";
import { AiBottomsheetFooter } from "./ai-bottomsheet-footer";

export const ToggleAiTaskGenerate = () => {
  const aiVoiceInputModalRef = useRef<BottomSheetModal>(null);
  const { startListening, partialText, stopAndGetText, isListening } = useVoiceInput();
  const { aiGeneratedTasks, sendMessage, modalType, connect, disconnect } = useAiTaskGenerator();
  const [isVoiceInput, setIsVoiceInput] = useState(true);
  const [text, setText] = useState("");
  const displayText = isListening
    ? [text, partialText].filter(Boolean).join(text ? " " : "")
    : text;

  const handleMicPressOut = async () => {
    const spoken = await stopAndGetText();

    let newText = text;
    if (spoken) {
      newText = text?.length ? `${text.trim()} ${spoken}` : spoken;
      setText(newText);
    }

    if (newText?.trim()) {
      sendMessage(newText.trim());
    }
  };

  return (
    <>
      <FAB
        icon="star"
        style={{
          position: "absolute",
          margin: 16,
          width: 58,
          right: 10,
          bottom: 10,
          backgroundColor: "#f65a83",
        }}
        onPress={async () => {
          await connect().catch(() => {});
          aiVoiceInputModalRef.current?.present();
        }}
      />
      <Portal>
        <BottomSheetModal
          ref={aiVoiceInputModalRef}
          onDismiss={async () => {
            try {
              if (isListening) {
                await handleMicPressOut();
              }
            } finally {
              setText("");
              disconnect();
            }
          }}
          snapPoints={["70%", "80%"]}
          enablePanDownToClose
          enableContentPanningGesture={false}
          backdropComponent={renderBottomSheetBackdrop}
          backgroundStyle={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
          footerComponent={(footerProps: BottomSheetFooterProps) => (
            <AiBottomsheetFooter
              {...footerProps}
              modalType={modalType}
              startListening={startListening}
              handleMicPressOut={handleMicPressOut}
              isListening={isListening}
              isVoiceInput={isVoiceInput}
              setIsVoiceInput={setIsVoiceInput}
            />
          )}
        >
          <BottomSheetView className="justify-center items-center" style={{ minHeight: 400 }}>
            <AiTaskGenerateModal
              modalType={modalType}
              aiGeneratedTasks={aiGeneratedTasks}
              text={text}
              setText={setText}
              isListening={isListening}
              isVoiceInput={isVoiceInput}
              displayText={displayText}
            />
          </BottomSheetView>
        </BottomSheetModal>
      </Portal>
    </>
  );
};
