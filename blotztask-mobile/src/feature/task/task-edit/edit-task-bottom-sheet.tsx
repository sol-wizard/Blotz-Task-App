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
  onDismiss,
}: {
  task: TaskDetailDTO;
  isOpen: boolean;
  onDismiss: () => void;
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

  const handleSubmit = () => {
    sheetRef.current?.dismiss();
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
      onDismiss={onDismiss}
      enablePanDownToClose
    >
      <BottomSheetView style={{ padding: 16 }}>
        <EditTaskForm
          task={task}
          onSubmit={handleSubmit}
          onCancel={() => sheetRef.current?.dismiss()}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
};

// EditTaskBottomSheet.displayName = 'EditTaskBottomSheet'
