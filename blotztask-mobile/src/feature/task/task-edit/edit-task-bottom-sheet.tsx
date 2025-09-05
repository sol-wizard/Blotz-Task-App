import { useCallback, useEffect, useRef } from "react";
import {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { EditTaskForm } from "./edit-task-form";
import { useBottomSheetStore } from "../util/bottomSheetStore";

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
    []
  );

  const { editTaskOpen, closeEditTask, openTaskDetail } = useBottomSheetStore();

  useEffect(() => {
    editTaskOpen ? sheetRef.current?.present() : sheetRef.current?.dismiss();
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
        <EditTaskForm
          task={task}
          onSubmit={handleClose}
          onCancel={handleClose}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
};
