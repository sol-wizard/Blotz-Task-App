import { useCallback, useEffect, useRef } from "react";
import {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { EditTaskForm } from "./edit-task-form";

export const EditTaskBottomSheet = ({
  task,
  isOpen,
  openTaskDetail,
}: {
  task: TaskDetailDTO;
  isOpen: boolean;
  openTaskDetail: () => void;
}) => {
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

  const handleClose = () => {
    sheetRef.current?.dismiss();
    openTaskDetail();
  };

  useEffect(() => {
    if (isOpen) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [isOpen]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={["55%"]}
      keyboardBlurBehavior="restore"
      backdropComponent={renderBackdrop}
      onDismiss={openTaskDetail}
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

// EditTaskBottomSheet.displayName = 'EditTaskBottomSheet'
