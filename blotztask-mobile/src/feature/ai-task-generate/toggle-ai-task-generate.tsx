import { useRef } from "react";
import { Platform, Pressable, Image } from "react-native";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { renderBottomSheetBackdrop } from "@/shared/components/ui/render-bottomsheet-backdrop";
import { GradientCircle } from "@/shared/components/common/gradient-circle";

import { ASSETS } from "@/shared/constants/assets";

import { AiTaskGenerateModal } from "./component/ai-modal-content";

export const ToggleAiTaskGenerate = () => {
  const aiVoiceInputModalRef = useRef<BottomSheetModal>(null);

  const openSheet = () => aiVoiceInputModalRef.current?.present();
  return (
    <>
      <Pressable onPress={openSheet}>
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
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        snapPoints={["70%"]}
        keyboardBehavior={Platform.OS === "ios" ? "extend" : "interactive"}
        keyboardBlurBehavior="restore"
        enablePanDownToClose={false}
      >
        <BottomSheetView className="justify-between items-center" style={{ minHeight: 300 }}>
          <AiTaskGenerateModal sheetRef={aiVoiceInputModalRef} />
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
};
