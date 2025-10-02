import { renderBottomSheetBackdrop } from "@/shared/components/ui/render-bottomsheet-backdrop";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { FAB, Portal } from "react-native-paper";
import { AiTaskGenerateModal } from "./component/ai-task-generate-modal";
import { useRef } from "react";
import { View } from "react-native";
import { GradientCircle } from "@/shared/components/common/gradient-circle";

export const ToggleAiTaskGenerate = () => {
  const aiVoiceInputModalRef = useRef<BottomSheetModal>(null);
  return (
    <>
      <View style={{ position: "absolute", right: 30, bottom: 30 }}>
        <GradientCircle size={58} colors={["#A3DC2F", "#2F80ED"]}>
          <FAB
            icon="star"
            customSize={58}
            color="#fff"
            style={{
              backgroundColor: "transparent",
              elevation: 0,
              shadowColor: "transparent",
            }}
            onPress={() => aiVoiceInputModalRef?.current?.present()}
          />
        </GradientCircle>
      </View>

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
            style={{ minHeight: 300 }}
          >
            <AiTaskGenerateModal />
          </BottomSheetView>
        </BottomSheetModal>
      </Portal>
    </>
  );
};
