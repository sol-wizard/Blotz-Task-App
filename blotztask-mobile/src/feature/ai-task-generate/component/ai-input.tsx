import { View, Text, TextInput } from "react-native";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";
import { ErrorMessageCard } from "./error-message-card";
import { theme } from "@/shared/constants/theme";
import VoiceInputButton from "./voice-input-button";
import { useTranslation } from "react-i18next";
import { BottomSheetType } from "../models/bottom-sheet-type";

export const AiInput = ({
  text,
  setText,
  isAiGenerating,
  aiGeneratedMessage,
  setModalType,
}: {
  text: string;
  setText: (v: string) => void;
  isAiGenerating: boolean;
  aiGeneratedMessage?: AiResultMessageDTO;
  setModalType: (type: BottomSheetType) => void;
}) => {
  const { t } = useTranslation(["aiTaskGenerate", "common"]);

  return (
    <View className="mb-8 mx-4">
      <View className="items-center mb-4">
        <View className="w-12 h-1 rounded-full bg-[#ECECEC]" />
      </View>
      <Text className="font-balooBold text-2xl mb-2 px-4 text-secondary">
        {t("aiTaskGenerate:labels.newTask")}
      </Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t("aiTaskGenerate:input.placeholder")}
        autoFocus
        placeholderTextColor={theme.colors.secondary}
        multiline
        className="font-baloo text-lg text-secondary bg-[#F4F4F4] border border-[#ECECEC] rounded-xl h-40 p-4"
        style={{ textAlignVertical: "top", textAlign: "left" }}
      />
      {aiGeneratedMessage?.errorMessage && (
        <ErrorMessageCard errorMessage={aiGeneratedMessage.errorMessage} />
      )}
      <VoiceInputButton
        isAiGenerating={isAiGenerating}
        startListening={() => setModalType("voice-input")}
      />
    </View>
  );
};
