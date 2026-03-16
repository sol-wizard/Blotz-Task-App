import React from "react";
import { SharedValue } from "react-native-reanimated";
import { ActionButton, ActionButtonType } from "./action-button";
import { View } from "react-native";




type NoteActionsProps<TNote> = {
  note: TNote;
  onAddToTask: (note: TNote) => void;
  onDelete: (note: TNote) => void;
  progress?: SharedValue<number>;
};


export function NoteActions<TNote>({
  note,
  onAddToTask,
  onDelete,
}: NoteActionsProps<TNote>) {
  return (
    <View className={`w-[190px] h-full flex-row items-center justify-end pr-4`} style={{ gap: 18 }}>
      <ActionButton
        type={ActionButtonType.Edit}
        onPress={() => {onAddToTask?.(note)}}
      />
      <ActionButton
        type={ActionButtonType.Delete}
        onPress={() => onDelete?.(note)}
      />
    </View>
  );
};
