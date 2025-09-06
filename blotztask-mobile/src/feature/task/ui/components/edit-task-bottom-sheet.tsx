import { useCallback, useEffect, useRef } from "react";
<<<<<<< HEAD
import { BottomSheetBackdrop, BottomSheetView, BottomSheetModal } from "@gorhom/bottom-sheet";
=======
import {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
>>>>>>> 6eb4676 (Frontend refactor (#467))
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
    [],
=======
    []
>>>>>>> 6eb4676 (Frontend refactor (#467))
  );

  const { editTaskOpen, closeEditTask, openTaskDetail } = useBottomSheetStore();

  useEffect(() => {
<<<<<<< HEAD
    if (editTaskOpen) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
=======
    editTaskOpen ? sheetRef.current?.present() : sheetRef.current?.dismiss();
>>>>>>> 6eb4676 (Frontend refactor (#467))
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
        <EditTaskForm task={task} onSubmit={handleClose} onCancel={handleClose} />
=======
        <EditTaskForm
          task={task}
          onSubmit={handleClose}
          onCancel={handleClose}
        />
>>>>>>> 6eb4676 (Frontend refactor (#467))
      </BottomSheetView>
    </BottomSheetModal>
  );
};
