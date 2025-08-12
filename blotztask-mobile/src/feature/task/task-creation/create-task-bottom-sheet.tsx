import React, { useRef, useEffect } from "react";
import { Text } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import TaskCreationForm from "../task-creation/task-creation-form";
import { Portal } from "react-native-paper";

export const CreateTaskBottomSheet = ({
  isVisible,
  onClose,
}: {
  isVisible: boolean;
  onClose: () => void;
}) => {
  const taskCreationBottomSheetRef = useRef<BottomSheet>(null);

  const handleTaskCreationSheetClose = () => {
    taskCreationBottomSheetRef.current?.close();
  };

  const handleTaskCreationSheetOpen = () => {
    taskCreationBottomSheetRef.current?.snapToIndex(0);
  };

  useEffect(() => {
    if (isVisible) {
      taskCreationBottomSheetRef.current?.snapToIndex(0);
    } else {
      taskCreationBottomSheetRef.current?.close();
    }
  }, [isVisible]);

  return (
    <Portal>
      <BottomSheet
        ref={taskCreationBottomSheetRef}
        index={-1}
        snapPoints={["80%"]}
        enablePanDownToClose
        onClose={onClose}
      >
        <BottomSheetView style={{ padding: 16 }}>
          <TaskCreationForm
            handleTaskCreationSheetClose={handleTaskCreationSheetClose}
            handleTaskCreationSheetOpen={handleTaskCreationSheetOpen}
          />
        </BottomSheetView>
      </BottomSheet>
    </Portal>
  );
};
