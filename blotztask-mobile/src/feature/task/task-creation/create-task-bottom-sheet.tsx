import React, { useRef, useCallback, useMemo } from "react";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import TaskCreationForm from "../task-creation/task-creation-form";
import { Portal } from "react-native-paper";
import { Pressable, View } from "react-native";

export const CreateTaskBottomSheet = ({
  isVisible,
  onClose,
}: {
  isVisible: boolean;
  onClose: (isVisible: boolean) => void;
}) => {
  const taskCreationBottomSheetRef = useRef<BottomSheet>(null);

  // const handleTaskCreationSheetClose = () => {
  //   taskCreationBottomSheetRef.current?.close();
  // };

  // const handleTaskCreationSheetOpen = () => {
  //   taskCreationBottomSheetRef.current?.snapToIndex(0);
  // };
  const snapPoints = useMemo(() => ["50%"], []);
  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose(false);
      }
    },
    [onClose]
  );

  return (
    <Portal>
      <View className="absolute inset-0 z-50">
        {isVisible && (
          <Pressable
            className="absolute inset-0 bg-black/50"
            onPress={() => taskCreationBottomSheetRef.current?.close()}
          />
        )}

        <BottomSheet
          ref={taskCreationBottomSheetRef}
          index={isVisible ? 0 : -1}
          snapPoints={snapPoints}
          keyboardBlurBehavior="restore"
          onChange={handleSheetChange}
          enablePanDownToClose
          onClose={() => onClose(false)}
        >
          <BottomSheetView style={{ padding: 16 }}>
            <TaskCreationForm
              handleTaskCreationSheetClose={handleSheetChange}
              // handleTaskCreationSheetOpen={handleTaskCreationSheetOpen}
            />
          </BottomSheetView>
        </BottomSheet>
      </View>
    </Portal>
  );
};
