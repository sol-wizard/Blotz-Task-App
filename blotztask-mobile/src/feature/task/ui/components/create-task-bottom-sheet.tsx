<<<<<<< HEAD
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
=======
import React, { useRef, useCallback } from "react";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { Portal } from "react-native-paper";
import { View } from "react-native";
import CreateTaskForm from "../forms/create-task-form";
>>>>>>> 6eb4676 (Frontend refactor (#467))

export const CreateTaskBottomSheet = ({
  isVisible,
  onClose,
  refreshCalendarPage,
}: {
<<<<<<< HEAD
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
=======
  isVisible: boolean;
  onClose: (isVisible: boolean) => void;
  refreshCalendarPage: () => void;
}) => {
  const taskCreationBottomSheetRef = useRef<BottomSheet>(null);
>>>>>>> 6eb4676 (Frontend refactor (#467))

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose(false);
      }
    },
<<<<<<< HEAD
<<<<<<< HEAD:blotztask-mobile/src/feature/task/ui/components/create-task-bottom-sheet.tsx
=======
>>>>>>> c05ce2d (Unify code style (#462))
    [onClose],
  );
=======
    [onClose]
<<<<<<< HEAD
  )
>>>>>>> b3808c0 (Edit task UI (#461)):blotztask-mobile/src/feature/task/task-creation/create-task-bottom-sheet.tsx
=======
  );
>>>>>>> 6eb4676 (Frontend refactor (#467))

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
<<<<<<< HEAD
<<<<<<< HEAD:blotztask-mobile/src/feature/task/ui/components/create-task-bottom-sheet.tsx
=======
>>>>>>> c05ce2d (Unify code style (#462))
    [],
  );
=======
    []
<<<<<<< HEAD
  )
>>>>>>> b3808c0 (Edit task UI (#461)):blotztask-mobile/src/feature/task/task-creation/create-task-bottom-sheet.tsx
=======
  );
>>>>>>> 6eb4676 (Frontend refactor (#467))

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
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> b91d27e (Bugs fix before launch (#481))
            <CreateTaskForm
              handleTaskCreationSheetClose={handleSheetChange}
              refreshCalendarPage={refreshCalendarPage}
            />
<<<<<<< HEAD
=======
            <CreateTaskForm handleTaskCreationSheetClose={handleSheetChange} />
>>>>>>> 6eb4676 (Frontend refactor (#467))
=======
>>>>>>> b91d27e (Bugs fix before launch (#481))
          </BottomSheetView>
        </BottomSheet>
      </View>
    </Portal>
  );
};
