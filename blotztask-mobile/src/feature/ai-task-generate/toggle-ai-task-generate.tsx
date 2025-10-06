import { renderBottomSheetBackdrop } from "@/shared/components/ui/render-bottomsheet-backdrop";
import BottomSheetKeyboardAvoidingView, {
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { FAB, Portal } from "react-native-paper";
import { AiTaskGenerateModal } from "./component/ai-task-generate-modal";
import { useMemo, useRef } from "react";
import { Pressable, View, Image, Platform, KeyboardAvoidingView } from "react-native";
import { GradientCircle } from "@/shared/components/common/gradient-circle";
import { ASSETS } from "@/shared/constants/assets";
import BottomSheet from "@gorhom/bottom-sheet";

export const ToggleAiTaskGenerate = () => {
  const aiVoiceInputModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["50%", "70%"], []);
  const openSheet = () => aiVoiceInputModalRef.current?.present();
  return (
    <>
      <View pointerEvents="box-none" className="absolute right-7 bottom-7 z-50">
        <Pressable onPress={openSheet} hitSlop={10} className="active:opacity-85">
          <GradientCircle size={58}>
            <View className="w-[58px] h-[58px] items-center justify-center">
              <Image source={ASSETS.whiteBun} className="w-[26px] h-[26px]" resizeMode="contain" />
            </View>
          </GradientCircle>
        </Pressable>
      </View>

      <BottomSheetModal
        ref={aiVoiceInputModalRef}
        backdropComponent={renderBottomSheetBackdrop}
        backgroundStyle={{
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        snapPoints={snapPoints}
        keyboardBehavior={Platform.OS === "ios" ? "extend" : "interactive"}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <BottomSheetView className="justify-between items-center" style={{ minHeight: 300 }}>
            <AiTaskGenerateModal />
          </BottomSheetView>
        </KeyboardAvoidingView>
      </BottomSheetModal>
    </>
  );
};
