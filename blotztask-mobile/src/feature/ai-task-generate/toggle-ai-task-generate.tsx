import { renderBottomSheetBackdrop } from "@/shared/components/ui/render-bottomsheet-backdrop";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { AiTaskGenerateModal } from "./component/ai-task-generate-modal";
import { useRef } from "react";
import { Platform } from "react-native";
import { FloatingDualButton } from "./component/floating-dual-button";

export const ToggleAiTaskGenerate = () => {
  const aiVoiceInputModalRef = useRef<BottomSheetModal>(null);

  const openSheet = () => aiVoiceInputModalRef.current?.present();

  return (
    <>
      <FloatingDualButton onOpenSheet={openSheet} />

      <BottomSheetModal
        ref={aiVoiceInputModalRef}
        backdropComponent={renderBottomSheetBackdrop}
        backgroundStyle={{
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        snapPoints={["50%", "70%"]}
        keyboardBehavior={Platform.OS === "ios" ? "extend" : "interactive"}
        keyboardBlurBehavior="restore"
        enableContentPanningGesture={false}
        enableHandlePanningGesture={true}
        enablePanDownToClose={false}
      >
        <BottomSheetView className="justify-between items-center" style={{ minHeight: 300 }}>
          <AiTaskGenerateModal sheetRef={aiVoiceInputModalRef} />
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
};
