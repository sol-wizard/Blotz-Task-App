import { BottomSheetView } from "@gorhom/bottom-sheet";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { EditTaskForm } from "../forms/edit-task-form";

export const EditTaskBottomSheet = ({
  task,
  handleClose,
}: {
  task: TaskDetailDTO;
  handleClose: () => void;
}) => {
  return (
    <BottomSheetView style={{ padding: 16 }}>
      <EditTaskForm task={task} onClose={handleClose} />
    </BottomSheetView>
  );
};
