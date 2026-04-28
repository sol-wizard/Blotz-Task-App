import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useNotesMutation } from "@/feature/notes/hooks/useNotesMutation";
import { theme } from "@/shared/constants/theme";

type NoteEditorParams = {
  noteId?: string;
  noteText?: string;
};

export default function NoteEditorScreen() {
  const router = useRouter();
  const { t } = useTranslation("notes");
  const params = useLocalSearchParams<NoteEditorParams>();
  const noteId = Array.isArray(params.noteId) ? params.noteId[0] : params.noteId;
  const initialTextParam = Array.isArray(params.noteText) ? params.noteText[0] : params.noteText;
  const initialText = useMemo(() => initialTextParam ?? "", [initialTextParam]);

  const [noteText, setNoteText] = useState(initialText);
  const { createNote, isNoteCreating, updateNote, isNoteUpdating } = useNotesMutation();

  const isEditMode = Boolean(noteId);
  const isSaving = isEditMode ? isNoteUpdating : isNoteCreating;
  const trimmedText = noteText.trim();
  const canSave = trimmedText.length > 0 && !isSaving;

  const handleBack = () => {
    router.back();
  };

  const handleSave = () => {
    if (!canSave) return;

    if (noteId) {
      updateNote(
        { id: noteId, text: trimmedText },
        {
          onSuccess: () => {
            router.back();
          },
        },
      );
      return;
    }

    createNote(trimmedText, {
      onSuccess: () => {
        router.back();
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="flex-1 px-6">
          <View className="h-14 flex-row items-center justify-between">
            <Pressable
              onPress={handleBack}
              className="h-10 w-10 items-center justify-center rounded-full bg-white"
            >
              <MaterialCommunityIcons name="chevron-left" size={28} color="#111827" />
            </Pressable>

            <Text className="font-balooBold text-xl text-black">
              {isEditMode ? t("editNote") : t("createNote")}
            </Text>

            <Pressable
              disabled={!canSave}
              onPress={handleSave}
              className={`h-10 min-w-20 items-center justify-center rounded-xl px-4 ${
                canSave ? "bg-highlight" : "bg-[#F3F4F6]"
              }`}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={theme.colors.onSurface} />
              ) : (
                <Text className="font-balooBold text-lg text-black">{t("save")}</Text>
              )}
            </Pressable>
          </View>

          <TextInput
            value={noteText}
            onChangeText={setNoteText}
            placeholder={t("notePlaceholder")}
            placeholderTextColor={theme.colors.primary}
            multiline
            autoFocus
            textAlignVertical="top"
            className="mt-4 flex-1 rounded-3xl bg-white px-5 py-5 font-baloo text-lg text-black"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
