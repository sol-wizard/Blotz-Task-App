<<<<<<< HEAD:blotztask-mobile/src/feature/task/ui/components/create-task-bottom-sheet.tsx
import React, { useRef, useCallback } from "react";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { Portal } from "react-native-paper";
import { View } from "react-native";
import CreateTaskForm from "../forms/create-task-form";
=======
import React, { useRef, useCallback } from 'react'
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet'
import TaskCreationForm from '../task-creation/task-creation-form'
import { Portal } from 'react-native-paper'
import { View } from 'react-native'
>>>>>>> b3808c0 (Edit task UI (#461)):blotztask-mobile/src/feature/task/task-creation/create-task-bottom-sheet.tsx

export const CreateTaskBottomSheet = ({
  isVisible,
  onClose,
  refreshCalendarPage,
}: {
<<<<<<< HEAD:blotztask-mobile/src/feature/task/ui/components/create-task-bottom-sheet.tsx
  isVisible: boolean;
  onClose: (isVisible: boolean) => void;
  refreshCalendarPage: () => void;
=======
  isVisible: boolean
  onClose: (isVisible: boolean) => void
>>>>>>> b3808c0 (Edit task UI (#461)):blotztask-mobile/src/feature/task/task-creation/create-task-bottom-sheet.tsx
}) => {
  const taskCreationBottomSheetRef = useRef<BottomSheet>(null)

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose(false)
      }
    },
<<<<<<< HEAD:blotztask-mobile/src/feature/task/ui/components/create-task-bottom-sheet.tsx
    [onClose],
  );
=======
    [onClose]
  )
>>>>>>> b3808c0 (Edit task UI (#461)):blotztask-mobile/src/feature/task/task-creation/create-task-bottom-sheet.tsx

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
<<<<<<< HEAD:blotztask-mobile/src/feature/task/ui/components/create-task-bottom-sheet.tsx
    [],
  );
=======
    []
  )
>>>>>>> b3808c0 (Edit task UI (#461)):blotztask-mobile/src/feature/task/task-creation/create-task-bottom-sheet.tsx

  return (
    <Portal>
      <View className="absolute inset-0 z-50">
        <BottomSheet
          ref={taskCreationBottomSheetRef}
          index={isVisible ? 0 : -1}
          snapPoints={['55%']}
          keyboardBlurBehavior="restore"
          backdropComponent={renderBackdrop}
          onChange={handleSheetChange}
          enablePanDownToClose
          onClose={() => onClose(false)}
        >
          <BottomSheetView style={{ padding: 16 }}>
            <CreateTaskForm
              handleTaskCreationSheetClose={handleSheetChange}
              refreshCalendarPage={refreshCalendarPage}
            />
          </BottomSheetView>
        </BottomSheet>
      </View>
    </Portal>
  )
}
