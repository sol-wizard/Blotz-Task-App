import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { EditedNoteDraftItemDto } from "../models/ai-coach-dto";
import { noteTextLength } from "../models/review-list";

export function ReviewNoteEditor({
  initial,
  busy,
  onCancel,
  onSave,
  onDirtyChange,
}: {
  initial: EditedNoteDraftItemDto;
  busy: boolean;
  onCancel: () => void;
  onSave: (value: EditedNoteDraftItemDto) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { t } = useTranslation("aiCoach");
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const length = noteTextLength(title, description);
  const dirty = title !== initial.title || description !== (initial.description ?? "");
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  const cancel = () => {
    if (busy) return;
    if (!dirty) {
      onCancel();
      return;
    }
    Alert.alert(t("review.discardEditTitle"), t("review.discardEditDescription"), [
      { text: t("review.keepEditing"), style: "cancel" },
      { text: t("review.discardEdit"), style: "destructive", onPress: onCancel },
    ]);
  };
  const save = () => {
    if (!title.trim()) {
      setError(t("review.titleRequired"));
      return;
    }
    if (length > 2000) {
      setError(t("review.noteTooLong"));
      return;
    }
    onSave({
      kind: "note",
      itemId: initial.itemId,
      title: title.trim(),
      description: description.trim() || null,
    });
  };
  return (
    <View className="bg-white rounded-2xl p-5 max-h-[85%]">
      <Text className="font-balooBold text-lg text-secondary mb-3">{t("review.editNote")}</Text>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text className="font-baloo text-primary mb-1">{t("review.titleLabel")}</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          editable={!busy}
          accessibilityLabel={t("review.titleLabel")}
          className="border border-gray-200 rounded-xl px-3 py-2 font-baloo text-base text-secondary mb-3"
        />
        <Text className="font-baloo text-primary mb-1">{t("review.noteBody")}</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          editable={!busy}
          multiline
          accessibilityLabel={t("review.noteBody")}
          textAlignVertical="top"
          className="border border-gray-200 rounded-xl px-3 py-2 font-baloo text-base text-secondary min-h-40"
        />
        <Text
          className={`font-baloo text-xs mt-2 ${length > 2000 ? "text-warning" : "text-primary"}`}
        >
          {t("review.noteLength", { count: length })}
        </Text>
        {error && (
          <Text accessibilityRole="alert" className="font-baloo text-warning mt-2">
            {error}
          </Text>
        )}
      </ScrollView>
      <View className="flex-row gap-3 mt-4">
        <Pressable
          onPress={cancel}
          disabled={busy}
          className="flex-1 py-3 rounded-xl bg-gray-100 items-center"
        >
          <Text className="font-balooBold text-secondary">{t("editModal.cancel")}</Text>
        </Pressable>
        <Pressable
          onPress={save}
          disabled={busy || length > 2000}
          accessibilityState={{ disabled: busy || length > 2000 }}
          className={`flex-1 py-3 rounded-xl bg-highlight items-center ${busy || length > 2000 ? "opacity-40" : ""}`}
        >
          <Text className="font-balooBold text-white">{t("review.saveChanges")}</Text>
        </Pressable>
      </View>
    </View>
  );
}
