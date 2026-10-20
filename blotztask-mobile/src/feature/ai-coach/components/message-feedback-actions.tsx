import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import { useNotesMutation } from "@/feature/notes/hooks/useNotesMutation";
import { AiCoachRating, MessageFeedbackDto } from "../models/ai-coach-dto";
import { replyToNoteText } from "../models/reply-note";

const reasons = ["inaccurate", "irrelevant", "unclear", "tone", "other"] as const;

export function MessageFeedbackActions({ text, feedback, busy, onRate, onSaveDetail, rateable = true }: {
  text: string;
  feedback: MessageFeedbackDto | undefined;
  busy: boolean;
  rateable?: boolean;
  onRate: (rating: AiCoachRating) => Promise<boolean>;
  onSaveDetail: (reason: string | null, detail: string | null) => Promise<boolean>;
}) {
  const { t } = useTranslation("aiCoach");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const { createNoteAsync, isNoteCreating } = useNotesMutation();
  const [noteSaved, setNoteSaved] = useState(false);

  const rate = async (rating: AiCoachRating) => {
    if (rating === "down" && feedback?.rating !== "down") {
      setReason(null);
      setDetail("");
      setOpen(true);
    }
    if (!await onRate(rating)) {
      setOpen(false);
      Toast.show({ type: "error", text1: t("feedback.saveFailed") });
    }
  };

  const saveDetail = async () => {
    if (await onSaveDetail(reason, detail.trim() || null)) setOpen(false);
    else Toast.show({ type: "error", text1: t("feedback.saveFailed") });
  };

  const copy = async () => {
    try {
      const Clipboard = await import("expo-clipboard");
      await Clipboard.setStringAsync(text);
      Toast.show({ type: "success", text1: t("feedback.copied") });
    } catch {
      Toast.show({ type: "error", text1: t("feedback.copyFailed") });
    }
  };

  const saveNote = async () => {
    const { text: noteText, truncated } = replyToNoteText(text);
    if (!noteText) return;
    try {
      await createNoteAsync({ text: noteText, isPersistent: false });
      setNoteSaved(true);
      Toast.show({ type: "success", text1: t(truncated ? "feedback.noteSavedTruncated" : "feedback.noteSaved") });
    } catch {
      Toast.show({ type: "error", text1: t("feedback.noteSaveFailed") });
    }
  };

  return (
    <>
      <View className="flex-row items-center -ml-2.5">
        {rateable && <><Pressable className="w-9 h-9 items-center justify-center" disabled={busy}
          accessibilityRole="button" accessibilityLabel={t("feedback.good")}
          accessibilityState={{ selected: feedback?.rating === "up" }}
          onPress={() => void rate("up")}>
          <Ionicons name={feedback?.rating === "up" ? "thumbs-up" : "thumbs-up-outline"}
            size={16} color={feedback?.rating === "up" ? "#84CC16" : "#8A8F9C"} />
        </Pressable>
        <Pressable className="w-9 h-9 items-center justify-center" disabled={busy}
          accessibilityRole="button" accessibilityLabel={t("feedback.bad")}
          accessibilityState={{ selected: feedback?.rating === "down" }}
          onPress={() => void rate("down")}
          onLongPress={() => {
            if (feedback?.rating !== "down") return;
            setReason(feedback.reason);
            setDetail(feedback.detail ?? "");
            setOpen(true);
          }}>
          <Ionicons name={feedback?.rating === "down" ? "thumbs-down" : "thumbs-down-outline"}
            size={16} color={feedback?.rating === "down" ? "#444964" : "#8A8F9C"} />
        </Pressable>
        </>}
        <Pressable className="w-9 h-9 items-center justify-center"
          accessibilityRole="button" accessibilityLabel={t("feedback.copy")}
          onPress={() => void copy()}>
          <Ionicons name="copy-outline" size={16} color="#8A8F9C" />
        </Pressable>
        <Pressable className="w-9 h-9 items-center justify-center" disabled={isNoteCreating || noteSaved}
          accessibilityRole="button" accessibilityLabel={t(noteSaved ? "feedback.noteSaved" : "feedback.saveNote")}
          accessibilityState={{ disabled: isNoteCreating || noteSaved, busy: isNoteCreating }}
          onPress={() => void saveNote()}>
          <Ionicons name={noteSaved ? "bookmark" : "bookmark-outline"} size={16}
            color={noteSaved ? "#84CC16" : "#8A8F9C"} />
        </Pressable>
      </View>

      <Modal visible={open && rateable} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView className="flex-1 justify-end bg-black/40"
          behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="bg-white rounded-t-3xl p-5 pb-8">
            <Text className="font-balooBold text-lg text-secondary mb-3">{t("feedback.title")}</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {reasons.map((value) => (
                <Pressable key={value} onPress={() => setReason(reason === value ? null : value)}
                  className={`rounded-full border px-3 py-2 ${reason === value ? "border-highlight bg-highlight" : "border-gray-200"}`}>
                  <Text className={`font-baloo text-sm ${reason === value ? "text-white" : "text-secondary"}`}>
                    {t(`feedback.reasons.${value}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput className="border border-gray-200 rounded-xl p-3 font-baloo text-secondary min-h-24"
              multiline maxLength={500} textAlignVertical="top" value={detail} onChangeText={setDetail}
              placeholder={t("feedback.detailPlaceholder")} />
            <View className="flex-row gap-3 mt-4">
              <Pressable className="flex-1 py-3 items-center" onPress={() => setOpen(false)}>
                <Text className="font-baloo text-primary">{t("feedback.skip")}</Text>
              </Pressable>
              <Pressable className="flex-1 py-3 rounded-xl bg-highlight items-center" disabled={busy}
                onPress={() => void saveDetail()}>
                <Text className="font-balooBold text-white">{t("feedback.save")}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
