import { theme } from "@/shared/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import Modal from "react-native-modal";

interface NoteModalProps {
  visible: boolean;
  noteText: string;
  isSaving: boolean;
  onChangeText: (text: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export const NoteInputModal = ({
  visible,
  noteText,
  isSaving,
  onChangeText,
  onClose,
  onSave,
}: NoteModalProps) => {
  const isSaveEnabled = noteText.trim().length > 0;
  const { t } = useTranslation("notes");

  return (
    <Modal
      animationIn="fadeIn"
      animationOut="fadeOut"
      animationInTiming={1}
      animationOutTiming={1}
      backdropTransitionInTiming={1}
      backdropTransitionOutTiming={1}
      hideModalContentWhileAnimating
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      useNativeDriver={false}
      backdropOpacity={0.3}
      style={{ margin: 0 }}
    >
      <View className="justify-center items-center">
        <View className="w-11/12 bg-white rounded-2xl p-3">
           <Pressable
            onPress={onClose}
            className="self-end w-10 h-10 rounded-full bg-[#F3F4F6] items-center justify-center"
          >
            <MaterialCommunityIcons name="close" size={16} color="#4B5563" />
          </Pressable>

          <TextInput
            value={noteText}
            onChangeText={onChangeText}
            placeholder={t("notePlaceholder")}
            placeholderTextColor={theme.colors.primary}
            multiline
            //autoFocus
            className="mt-3 h-36 rounded-xl bg-background px-4 text-base mx-4"
          />

          <Pressable
            disabled={!isSaveEnabled || isSaving}
            onPress={onSave}
            className={`mt-8 w-32 h-10 rounded-xl items-center justify-center self-center ${
              isSaveEnabled && !isSaving ? "bg-highlight" : "bg-[#F3F4F6]"
            }`}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.colors.onSurface} />
            ) : (
              <Text className="font-balooBold text-lg text-black rounded-xl items-center justify-center">
                {t("save")}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};
