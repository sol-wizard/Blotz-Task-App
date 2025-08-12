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
  const bottomSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  return (
    <Portal>
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={["50%", "80%"]}
        enablePanDownToClose
        onClose={onClose}
      >
        <BottomSheetView style={{ padding: 16 }}>
          <TaskCreationForm />
        </BottomSheetView>
      </BottomSheet>
    </Portal>
  );
};
