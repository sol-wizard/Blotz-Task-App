import React, { useRef, useState } from "react";
import Animated from "react-native-reanimated";
import ReanimatedSwipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";

import { NoteDTO } from "../models/note-dto";
import { NoteCard } from "./note-card";
import { NoteActions } from "./note-actions";
import { NoteTimeEstimateModal } from "./note-time-estimate-modal";

import { useEstimateTaskTime } from "../hooks/useEstimateTaskTime";
import { MotionAnimations } from "@/shared/constants/animations/motion";

export const NoteRow = ({
  note,
  onPressNote,
  onDelete,
  onRowOpen
}: {
  note: NoteDTO;
  onPressNote: (note: NoteDTO) => void;
  onDelete: (note: NoteDTO) => void;
  onRowOpen: (ref: SwipeableMethods | null) => void;
}) => {

  const [isSwiping, setIsSwiping] = useState(false);
  const [isEstimateModalVisible, setIsEstimateModalVisible] = useState(false);
  const { estimateTime, isEstimating, estimationResult, estimationError } = useEstimateTaskTime();

  const swipeRef = useRef<SwipeableMethods | null>(null);

  const handleAddToTask = () => {
    setIsEstimateModalVisible(true);
    estimateTime(note);
  };



  return (
    <Animated.View
      entering={MotionAnimations.upEntering}
      exiting={MotionAnimations.rightExiting}
      layout={MotionAnimations.layout}
    >
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
          onRowOpen(swipeRef.current);
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
            isDeleting={false}
            onDelete={() => {}}
            onToggle={() => {}}
          />
        </Animated.View>
      </ReanimatedSwipeable>
        
      <NoteTimeEstimateModal
        visible={isEstimateModalVisible}
        setIsModalVisible={setIsEstimateModalVisible}
        isEstimating={isEstimating}
        estimateResult={estimationResult}
        estimationError={estimationError}
      />
    </Animated.View>
  );
};
