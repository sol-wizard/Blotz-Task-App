import { renderBottomSheetBackdrop } from "@/shared/components/ui/render-bottomsheet-backdrop";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { FAB, Portal } from "react-native-paper";
import { AiTaskGenerateModal } from "./ai-task-generate-modal";
import { useRef } from "react";

export const ToggleAiTaskGenerate = () => {
  const aiVoiceInputModalRef = useRef<BottomSheetModal>(null);
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
        onPress={() => {
          aiVoiceInputModalRef?.current?.present();
          console.log(!!aiVoiceInputModalRef.current);
        }}
      />

      <Portal>
        <BottomSheetModal
          ref={aiVoiceInputModalRef}
          snapPoints={["70%", "80%"]}
          enablePanDownToClose
          backdropComponent={renderBottomSheetBackdrop}
          backgroundStyle={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        >
          <BottomSheetView
            className="flex-1 justify-between items-center"
            style={{ minHeight: 400 }}
          >
            <AiTaskGenerateModal />
          </BottomSheetView>
        </BottomSheetModal>
      </Portal>
    </>
  );
};
