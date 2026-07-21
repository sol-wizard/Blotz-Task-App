import React, { RefObject, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import ReanimatedSwipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";

const FULL_SWIPE_DELETE_THRESHOLD = -250;
const DELETE_ACTION_WIDTH = 75;

type Props = {
  onDelete: () => void;
  onRowOpen: (ref: RefObject<SwipeableMethods | null>) => void;
  enabled?: boolean;
  children: React.ReactNode;
};

type DeleteActionProps = {
  translation: SharedValue<number>;
  rowWidth: SharedValue<number>;
  hasCrossedDeleteThreshold: SharedValue<boolean>;
  onDelete: () => void;
};

function DeleteAction({
  translation,
  rowWidth,
  hasCrossedDeleteThreshold,
  onDelete,
}: DeleteActionProps) {
  const { t } = useTranslation("notes");
  const leftAlignmentProgress = useSharedValue(0);

  //calcuate the revealed aread width and position the icon
  const actionContentStyle = useAnimatedStyle(() => {
    const revealedWidth = Math.min(Math.max(-translation.value, 0), rowWidth.value);
    const centeredOffset = (DELETE_ACTION_WIDTH - revealedWidth) / 2;
    const leftAlignedOffset = DELETE_ACTION_WIDTH - revealedWidth;

    return {
      transform: [
        {
          translateX:
            centeredOffset + (leftAlignedOffset - centeredOffset) * leftAlignmentProgress.value,
        },
      ],
    };
  });

  useAnimatedReaction(
    () => translation.value <= FULL_SWIPE_DELETE_THRESHOLD,
    (hasPassedThreshold) => {
      // decide whether to delete on release.
      hasCrossedDeleteThreshold.value = hasPassedThreshold;

      // Controls the icon position, align left means passed threshold.
      leftAlignmentProgress.value = withTiming(hasPassedThreshold ? 1 : 0, { duration: 120 });
    },
    [],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("noteActions.delete")}
      onPress={onDelete}
      className="h-full items-center justify-center"
      style={{ width: DELETE_ACTION_WIDTH }}
    >
      <Animated.View className="items-center" style={actionContentStyle}>
        <MaterialCommunityIcons name="trash-can-outline" size={18} color="white" />
        <Text className="mt-0.5 text-base leading-5 font-baloo text-white">
          {t("noteActions.delete")}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// Swipe-to-delete wrapper for an AI draft card. Mirrors the Notes NoteRow pattern; the delete
// action is disabled (enabled=false) while the AI is generating so a delete can't race the
// incoming ReceiveGenerationResult snapshot.
export function AiResultRow({ onDelete, onRowOpen, enabled = true, children }: Props) {
  const swipeRef = useRef<SwipeableMethods | null>(null);
  const rowWidth = useSharedValue(0);
  const hasCrossedDeleteThreshold = useSharedValue(false);
  const deleteBackgroundOpacity = useSharedValue(0);
  const deleteBackgroundStyle = useAnimatedStyle(() => ({
    opacity: deleteBackgroundOpacity.value,
  }));

  return (
    <View
      className="my-4 w-[88%] self-center overflow-hidden rounded-2xl"
      onLayout={(event) => {
        rowWidth.value = event.nativeEvent.layout.width;
      }}
    >
      <Animated.View
        pointerEvents="none"
        className="absolute inset-0 rounded-2xl"
        style={[{ backgroundColor: "#F0625F" }, deleteBackgroundStyle]}
      />
      <ReanimatedSwipeable
        ref={swipeRef}
        enabled={enabled}
        containerStyle={{ width: "100%" }}
        renderRightActions={(_, translation) => (
          <DeleteAction
            translation={translation}
            rowWidth={rowWidth}
            hasCrossedDeleteThreshold={hasCrossedDeleteThreshold}
            onDelete={onDelete}
          />
        )}
        rightThreshold={32}
        onSwipeableOpenStartDrag={() => {
          deleteBackgroundOpacity.value = 1;
        }}
        onSwipeableWillOpen={() => {
          onRowOpen(swipeRef);
          if (hasCrossedDeleteThreshold.value) {
            onDelete();
          }
        }}
        onSwipeableWillClose={() => {
          hasCrossedDeleteThreshold.value = false;
        }}
        onSwipeableClose={() => {
          deleteBackgroundOpacity.value = 0;
        }}
      >
        {children}
      </ReanimatedSwipeable>
    </View>
  );
}
