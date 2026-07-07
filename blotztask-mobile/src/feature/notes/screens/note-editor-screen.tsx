import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useNotesMutation } from "@/feature/notes/hooks/useNotesMutation";
import { ToggleSwitch } from "@/feature/settings/components/toggle-switch";
import { ReturnButton } from "@/shared/components/return-button";
import { theme } from "@/shared/constants/theme";
import { analytics } from "@/shared/services/analytics";

type NoteEditorParams = {
  noteId?: string;
  noteText?: string;
  isPersistent?: string;
};

export default function NoteEditorScreen() {
  const router = useRouter();
  const { t } = useTranslation("notes");

  const { noteId, noteText: initialTextParam, isPersistent: initialIsPersistentParam } =
    useLocalSearchParams<NoteEditorParams>();
  const initialText = initialTextParam ?? "";

  const [noteText, setNoteText] = useState(initialText);
  const [isPersistent, setIsPersistent] = useState(initialIsPersistentParam === "true");
  const { createNote, isNoteCreating, updateNote, isNoteUpdating } = useNotesMutation();

  const isSaving = noteId ? isNoteUpdating : isNoteCreating;
  const trimmedText = noteText.trim();
  const canSave = trimmedText.length > 0 && !isSaving;

  const handleSave = () => {
    if (!canSave) return;

    if (noteId) {
      updateNote(
        { id: noteId, text: trimmedText, isPersistent },
        {
          onSuccess: () => {
            router.back();
          },
        },
      );
      return;
    }

    createNote({ text: trimmedText, isPersistent }, {
      onSuccess: () => {
        analytics.trackNoteCreated({ source: "manual" });
        router.back();
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="flex-1 px-6">
          <View className="h-14 flex-row items-center justify-between">
            <ReturnButton className="h-10 w-10 border-0 bg-white" />

            <Text className="font-balooBold text-xl text-black">
              {noteId ? t("editNote") : t("createNote")}
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
            maxLength={2000}
            multiline
            autoFocus
            textAlignVertical="top"
            className="mt-4 flex-1 rounded-3xl bg-white px-5 py-5 font-baloo text-lg text-black"
          />

          <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-white px-5 py-4">
            <Text className="font-baloo text-lg text-black">{t("persistentNote")}</Text>
            <ToggleSwitch value={isPersistent} onChange={() => setIsPersistent(!isPersistent)} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
