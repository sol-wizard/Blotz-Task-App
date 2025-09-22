import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GradientCircle } from "@/shared/components/common/gradient-circle";
import { InputModeSwitch } from "./input-mode-switch";
import { ModalType } from "../modals/modal-type";
import {
  BottomSheetFooter,
  BottomSheetFooterProps,
  TouchableOpacity as BottomSheetTouchableOpacity,
} from "@gorhom/bottom-sheet";

type ExtraProps = {
  modalType: ModalType;
  startListening: () => Promise<void>;
  handleMicPressOut: () => Promise<void>;
  isListening: boolean;
  isVoiceInput: boolean;
  setIsVoiceInput: (v: boolean) => void;
};

export const AiBottomsheetFooter: React.FC<BottomSheetFooterProps & ExtraProps> = ({
  animatedFooterPosition,
  modalType,
  startListening,
  handleMicPressOut,
  isListening,
  isVoiceInput,
  setIsVoiceInput,
}) => {
  if (modalType !== "input") return null;

  const handleMicTap = async () => {
    if (isListening) {
      await handleMicPressOut();
    } else {
      await startListening();
    }
  };

  return (
    <BottomSheetFooter animatedFooterPosition={animatedFooterPosition} bottomInset={0}>
      <View className="items-center">
        {isVoiceInput && (
          <>
            <BottomSheetTouchableOpacity
              onPress={handleMicTap}
              activeOpacity={0.85}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <GradientCircle>
                <Ionicons name="mic-outline" size={35} color="white" />
              </GradientCircle>
            </BottomSheetTouchableOpacity>

            <Text className="text-lg mt-4 text-gray-500 font-baloo">
              {isListening ? "Recognising..." : "Touch and speak"}
            </Text>
          </>
        )}

        <View>
          <InputModeSwitch value={isVoiceInput} onChange={setIsVoiceInput} />
        </View>
      </View>
    </BottomSheetFooter>
  );
};
