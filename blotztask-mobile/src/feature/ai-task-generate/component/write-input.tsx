import { ASSETS } from "@/shared/constants/assets";
import { theme } from "@/shared/constants/theme";
import { BottomSheetModal, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { View, Text, Image, Keyboard } from "react-native";

export const WriteInput = ({
  text,
  setText,
  sheetRef,
  hasError,
  sendMessage,
  errorMessage,
}: {
  text: string;
  setText: (v: string) => void;
  sheetRef: React.RefObject<BottomSheetModal | null>;
  hasError: boolean;
  sendMessage: (v: string) => void;
  errorMessage?: string;
}) => {
  const sendAndDismiss = (msg: string) => {
    const val = msg.trim();
    if (!val) return;
    sendMessage(val);
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
    <View className="w-full px-4 pt-3 pb-6 items-center">
      <BottomSheetTextInput
        value={text}
        onChangeText={handleChange}
        onSubmitEditing={() => sendAndDismiss(text)}
        returnKeyType="done"
        enablesReturnKeyAutomatically
        placeholder="I have a team meeting scheduled for 9am today...And 10am workout."
        placeholderTextColor={theme.colors.secondary}
        multiline
        className="w-full min-h-[100px] rounded-xl bg-white px-3 py-4 mt-4 text-xl text-gray-800 font-baloo text-left"
        style={{ textAlignVertical: "top" }}
      />
      {hasError && (
        <View className="bg-background rounded-2xl px-4 py-6 mb-4 w-96 flex-row">
          <Text className="text-[#3D8DE0] text-2xl font-balooBold pt-2 w-72">{errorMessage}</Text>
          <Image source={ASSETS.greenBun} className="w-20 h-20" />
        </View>
      )}
    </View>
  );
};
