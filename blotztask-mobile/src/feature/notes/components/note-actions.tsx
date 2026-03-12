import React, { memo, useState } from "react";
import { SharedValue } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { ActionButton } from "./action-button";
import { View } from "react-native";




type NoteActionsProps<TNote> = {
  note?: TNote;
  onAddToTask?: (note?: TNote) => void;
  onDelete?: (note?: TNote) => void;
  progress?: SharedValue<number>;
  widthClassName?: string;
};

export function NoteActions<TNote>({
  note,
  onAddToTask,
  onDelete,
}: NoteActionsProps<TNote>) {
  const [isDeleting] = useState(false);
  const { t } = useTranslation("notes");
  return (
    <View className={`w-[190px] h-full flex-row items-center justify-end pr-4`}>
      <View className="flex-row items-center" style={{ gap: 18 }}>
        <ActionButton
          icon="calendar-plus"
          label={t("noteActions.addToTask")}
          bgColor="bg-[#8BC34A]"
          onPress={() => onAddToTask?.(note)}
          className="ml-2" iconColor={""}        
        />
        <ActionButton
          icon="trash-can-outline"
          label={t("noteActions.delete")}
          bgColor="bg-[#F0625F]"
          onPress={() => onDelete?.(note)}
          className="ml-2"
          disabled={isDeleting}
          isLoading={isDeleting} iconColor={""}        />
      </View>
    </View>
  );
});
