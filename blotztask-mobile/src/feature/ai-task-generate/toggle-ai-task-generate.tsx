import { useRef, useState } from "react";
import { Platform, Pressable, Image } from "react-native";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { renderBottomSheetBackdrop } from "@/shared/components/ui/render-bottomsheet-backdrop";
import { GradientCircle } from "@/shared/components/common/gradient-circle";

import { ASSETS } from "@/shared/constants/assets";

import { AiModalContent } from "./component/ai-modal-content";
import { BottomSheetType } from "./models/bottom-sheet-type";

export const ToggleAiTaskGenerate = () => {
  const aiVoiceInputModalRef = useRef<BottomSheetModal>(null);
  const [modalType, setModalType] = useState<BottomSheetType>("input");
  const modalBackgroundColor = modalType === "add-task-success" ? "#F5F9FA" : "#FFFFFF";

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
          backgroundColor: modalBackgroundColor,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        snapPoints={["40%", "70%"]}
        keyboardBehavior={Platform.OS === "ios" ? "extend" : "interactive"}
        keyboardBlurBehavior="restore"
        enablePanDownToClose={false}
      >
        <AiModalContent
          sheetRef={aiVoiceInputModalRef}
          modalType={modalType}
          setModalType={setModalType}
        />
      </BottomSheetModal>
    </>
  );
};
