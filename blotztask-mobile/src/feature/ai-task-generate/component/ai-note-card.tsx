import React, { useState } from "react";
import { View, TextInput, Pressable, Keyboard } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "@/shared/constants/theme";
import { useTranslation } from "react-i18next";
import { AiNoteDTO } from "../models/ai-note-dto";

type Props = {
  note: AiNoteDTO;
  handleNoteDelete: (noteId: string) => void;
  onTextChange?: (noteId: string, newText: string) => void;
};

export function AiNoteCard({ note, handleNoteDelete, onTextChange }: Props) {
  const { t } = useTranslation("aiTaskGenerate");
  const [draftText, setDraftText] = useState(note.text);

  const handleEdit = () => {
    const trimmed = draftText.trim();
    if (trimmed && trimmed !== note.text) {
      onTextChange?.(note.id, trimmed);
    } else if (!trimmed) {
      setDraftText(note.text);
    }
    Keyboard.dismiss();
  };

  return (
    <View className="bg-white rounded-2xl flex-row items-center shadow-md w-[88%] min-h-20 justify-between pr-3 ml-7 mt-4 mb-4 py-4 pl-6 mx-4">
      <View className="flex-1 flex-row items-center ml-4">
        <TextInput
          value={draftText}
          onChangeText={setDraftText}
          onBlur={handleEdit}
          onSubmitEditing={handleEdit}
          returnKeyType="done"
          multiline
          className="flex-1 mr-3 text-lg font-baloo leading-5"
          style={{ color: theme.colors.onSurface }}
          placeholder={t("noteCard.textPlaceholder")}
          placeholderTextColor={theme.colors.disabled}
          accessibilityLabel={t("noteCard.editTextLabel")}
          accessibilityHint={t("noteCard.editTextHint")}
          autoFocus={false}
        />
      </View>

      <Pressable
        onPress={() => handleNoteDelete(note.id)}
        hitSlop={10}
        className="justify-center w-8 h-8 rounded-full ml-3"
        android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: false }}
      >
        <MaterialCommunityIcons name="close" size={20} color="#2F3640" />
      </Pressable>
    </View>
  );
}
