import React from "react";
import { View, Text, Pressable } from "react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { useTranslation } from "react-i18next";

type Props = {
  userInput: string;
  onSaveAsNote: () => void;
};

/**
 * Shown when the AI ran fine but found nothing task-shaped in what the user said.
 *
 * The point is that the user can see what we heard. Otherwise a mis-transcription and a genuinely
 * task-free sentence look identical, and the only move left is to say it again and hope.
 *
 * It sits above the input bar rather than taking over the sheet because drafts from earlier turns
 * stay on screen underneath, and a barren turn must not hide work the user has already done.
 */
export function AiEmptyResult({ userInput, onSaveAsNote }: Props) {
  const { t } = useTranslation("aiTaskGenerate");
  // Voice can fail before any transcript arrives; with nothing to show there is nothing to save,
  // but the user still needs to know the turn produced nothing.
  const hasUserInput = userInput.trim().length > 0;

  return (
    <View className="w-full px-6 pb-2">
      <View className="w-full border-t border-white/20 pt-3">
        <Text className="text-white/70 font-baloo text-sm">{t("emptyResult.title")}</Text>

        {hasUserInput && (
          <View className="flex-row items-center gap-3 mt-1">
            <Text className="flex-1 italic text-white/70" numberOfLines={2}>
              &ldquo;{userInput}&rdquo;
            </Text>
            <Pressable
              onPress={onSaveAsNote}
              accessibilityRole="button"
              accessibilityLabel={t("emptyResult.saveAsNote")}
              className="h-10 px-4 rounded-full flex-row items-center justify-center gap-1"
              style={{ backgroundColor: "rgba(255,255,255,0.25)" }}
            >
              <MaterialCommunityIcons name="note-plus-outline" size={18} color="white" />
              <Text className="text-white font-baloo text-sm">{t("emptyResult.saveAsNote")}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
