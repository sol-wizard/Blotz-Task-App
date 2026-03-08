import React, { useRef, useState, useEffect } from "react";
import Animated from "react-native-reanimated";
import ReanimatedSwipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { NoteDTO } from "../models/note-dto";
import { NoteCard } from "./note-card";
import { NoteActions } from "./note-actions";
import { NoteTimeEstimateModal } from "./note-time-estimate-modal";

import { useEstimateTaskTime } from "../hooks/useEstimateTaskTime";
import { convertDurationToMinutes, convertDurationToText } from "@/shared/util/convert-duration";
import { useAddNoteToTask } from "@/shared/hooks/add-note-to-task";
import { useNotesMutation } from "../hooks/useNotesMutation";
import { MotionAnimations } from "@/shared/constants/animations/motion";

export const NoteRow = ({
  note,
  onPressNote,
  onDelete,
  registerSwipeable,
  closeOtherRows,
}: {
  note: NoteDTO;
  onPressNote: (note: NoteDTO) => void;
  onDelete: (note: NoteDTO) => void;
  registerSwipeable: (id: string, ref: SwipeableMethods | null) => void;
  closeOtherRows: (openId: string) => void;
}) => {
  const { t } = useTranslation("notes");

  const [isSwiping, setIsSwiping] = useState(false);
  const [isEstimateModalVisible, setIsEstimateModalVisible] = useState(false);
  const addNoteToTask = useAddNoteToTask();
  const { estimateTime, isEstimating, timeResult, estimateError } = useEstimateTaskTime();
  const { deleteNote } = useNotesMutation();
  const noteId = String(note.id);

  const swipeRef = useRef<SwipeableMethods | null>(null);

  useEffect(() => {
    registerSwipeable(noteId, swipeRef.current);
  }, [noteId, registerSwipeable]);

  const handleAddToTask = () => {
    setIsEstimateModalVisible(true);
    estimateTime(note);
  };

  const handleStartNow = () => {
    const durationMinutes = convertDurationToMinutes(timeResult ?? "");
    if (durationMinutes === undefined) return;

    addNoteToTask({
      note,
      onSuccess: () => {
        setIsEstimateModalVisible(false);
        deleteNote(note.id);
        router.push("/(protected)/(tabs)");
      },
    });
  };

  return (
    <Animated.View entering={MotionAnimations.upEntering} exiting={MotionAnimations.rightExiting} layout={MotionAnimations.layout}>
      <ReanimatedSwipeable
        ref={swipeRef}
        renderRightActions={(progress) => (
          <NoteActions
            note={note}
            progress={progress}
            onAddToTask={() => handleAddToTask()}
            onDelete={() => onDelete(note)}
          />
        )}
        rightThreshold={32}
        overshootRight={false}
        friction={2}
        onSwipeableWillOpen={() => {
          closeOtherRows(noteId);
          setIsSwiping(true);
        }}
        onSwipeableWillClose={() => {
          setIsSwiping(false);
        }}
      >
        <Animated.View
          className={`flex-1 overflow-hidden rounded-3xl ${isSwiping ? "bg-gray-100" : "bg-white"}`}
        >
          <NoteCard
            note={note}
            onPressCard={() => onPressNote(note)}
            isToggled={false}
            onToggle={() => {}}
            isDeleting={false}
            onDelete={() => {}}
          />
        </Animated.View>
      </ReanimatedSwipeable>

      <NoteTimeEstimateModal
        visible={isEstimateModalVisible}
        setIsModalVisible={setIsEstimateModalVisible}
        handleStartNow={handleStartNow}
        durationText={convertDurationToText(timeResult ?? "")}
        isEstimating={isEstimating}
        error={estimateError ? t("timeEstimate.errorMessage") : null}
      />
    </Animated.View>
  );
};
