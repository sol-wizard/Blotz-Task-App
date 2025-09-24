import React, { useRef, useCallback } from "react";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { Portal } from "react-native-paper";
import { View } from "react-native";
import CreateTaskForm from "../../forms/create-task-form";

export const CreateTaskBottomSheet = ({
  isVisible,
  onClose,
}: {
  isVisible: boolean;
  onClose: (isVisible: boolean) => void;
}) => {
  const taskCreationBottomSheetRef = useRef<BottomSheet>(null);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose(false);
      }
    },
    [onClose],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <Portal>
      <View className="absolute inset-0 z-50">
        <BottomSheet
          ref={taskCreationBottomSheetRef}
          index={isVisible ? 0 : -1}
          snapPoints={["55%"]}
          keyboardBlurBehavior="restore"
          backdropComponent={renderBackdrop}
          onChange={handleSheetChange}
          enablePanDownToClose
          onClose={() => onClose(false)}
        >
          <BottomSheetView style={{ padding: 16 }}>
            <CreateTaskForm handleTaskCreationSheetClose={handleSheetChange} />
          </BottomSheetView>
        </BottomSheet>
      </View>
    </Portal>
  );
};
