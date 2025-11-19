import { CustomSpinner } from "@/shared/components/ui/custom-spinner";
import { ASSETS } from "@/shared/constants/assets";
import { theme } from "@/shared/constants/theme";
import { BottomSheetModal, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { View, Text, Image, Keyboard } from "react-native";
import { ErrorMessageCard } from "./error-message-card";

export const WriteInput = ({
  text,
  setText,
  sheetRef,
  hasError,
  sendMessage,
  errorMessage,
  isAiGenerating,
}: {
  text: string;
  setText: (v: string) => void;
  sheetRef: React.RefObject<BottomSheetModal | null>;
  hasError: boolean;
  sendMessage: (v: string) => void;
  errorMessage?: string;
  isAiGenerating: boolean;
}) => {
  const sendAndDismiss = (msg: string) => {
    const val = msg.trim();
    if (!val) return;
    sendMessage(val);
    setText(val);
    Keyboard.dismiss();
    sheetRef.current?.collapse();
  };

  const handleChange = (value: string) => {
    setText(value);
    if (value.endsWith("\n")) {
      sendAndDismiss(value);
      return;
    }
  };

  return (
    <View>
      <BottomSheetTextInput
        value={text}
        onChangeText={handleChange}
        onSubmitEditing={() => sendAndDismiss(text)}
        returnKeyType="done"
        enablesReturnKeyAutomatically
        placeholder="I have a team meeting scheduled for 9am today...And 10am workout."
        placeholderTextColor={theme.colors.secondary}
        multiline
        className="min-h-[100px] bg-white text-xl text-gray-800 font-baloo"
        style={{ textAlignVertical: "top" }}
      />
      {hasError && <ErrorMessageCard errorMessage={errorMessage} />}
      {isAiGenerating && (
        <View className="items-center">
          <CustomSpinner size={60} />
        </View>
      )}
    </View>
  );
};
