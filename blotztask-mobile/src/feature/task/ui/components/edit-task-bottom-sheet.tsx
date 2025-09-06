import { useCallback, useEffect, useRef } from "react";
<<<<<<< HEAD
<<<<<<< HEAD
import { BottomSheetBackdrop, BottomSheetView, BottomSheetModal } from "@gorhom/bottom-sheet";
=======
import {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
>>>>>>> 6eb4676 (Frontend refactor (#467))
=======
import { BottomSheetBackdrop, BottomSheetView, BottomSheetModal } from "@gorhom/bottom-sheet";
>>>>>>> c05ce2d (Unify code style (#462))
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";

import { useBottomSheetStore } from "../../store/bottomSheetStore";
import { EditTaskForm } from "../forms/edit-task-form";

export const EditTaskBottomSheet = ({ task }: { task: TaskDetailDTO }) => {
  const sheetRef = useRef<BottomSheetModal>(null);

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
<<<<<<< HEAD
    [],
=======
    []
>>>>>>> 6eb4676 (Frontend refactor (#467))
=======
    [],
>>>>>>> c05ce2d (Unify code style (#462))
  );

  const { editTaskOpen, closeEditTask, openTaskDetail } = useBottomSheetStore();

  useEffect(() => {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> c05ce2d (Unify code style (#462))
    if (editTaskOpen) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
<<<<<<< HEAD
=======
    editTaskOpen ? sheetRef.current?.present() : sheetRef.current?.dismiss();
>>>>>>> 6eb4676 (Frontend refactor (#467))
=======
>>>>>>> c05ce2d (Unify code style (#462))
  }, [editTaskOpen]);

  const handleClose = () => {
    closeEditTask();
    openTaskDetail();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={["55%"]}
      keyboardBlurBehavior="restore"
      backdropComponent={renderBackdrop}
      onDismiss={handleClose}
      enablePanDownToClose
    >
      <BottomSheetView style={{ padding: 16 }}>
<<<<<<< HEAD
<<<<<<< HEAD
        <EditTaskForm task={task} onSubmit={handleClose} onCancel={handleClose} />
=======
        <EditTaskForm
          task={task}
          onSubmit={handleClose}
          onCancel={handleClose}
        />
>>>>>>> 6eb4676 (Frontend refactor (#467))
=======
        <EditTaskForm task={task} onSubmit={handleClose} onCancel={handleClose} />
>>>>>>> c05ce2d (Unify code style (#462))
      </BottomSheetView>
    </BottomSheetModal>
  );
};
