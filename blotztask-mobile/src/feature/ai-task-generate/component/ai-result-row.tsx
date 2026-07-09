import React, { RefObject, useRef } from "react";
import { View } from "react-native";
import ReanimatedSwipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { ActionButton, ActionButtonType } from "@/feature/notes/components/action-button";

type Props = {
  onDelete: () => void;
  onRowOpen: (ref: RefObject<SwipeableMethods | null>) => void;
  enabled?: boolean;
  children: React.ReactNode;
};

// Swipe-to-delete wrapper for an AI draft card. Mirrors the Notes NoteRow pattern; the delete
// action is disabled (enabled=false) while the AI is generating so a delete can't race the
// incoming ReceiveGenerationResult snapshot.
export function AiResultRow({ onDelete, onRowOpen, enabled = true, children }: Props) {
  const swipeRef = useRef<SwipeableMethods | null>(null);

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      enabled={enabled}
      renderRightActions={() => (
        <View className="h-full items-center justify-center pr-6">
          <ActionButton type={ActionButtonType.Delete} onPress={onDelete} />
        </View>
      )}
      rightThreshold={32}
      overshootRight={false}
      friction={2}
      onSwipeableWillOpen={() => onRowOpen(swipeRef)}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
