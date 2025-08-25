import { Portal } from 'react-native-paper'
import React, { useCallback, useRef } from 'react'
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet'
import { TaskDetailDTO } from '@/shared/models/task-detail-dto'
import { EditTaskForm } from './edit-task-form'
import { updateTaskItem } from '../services/task-service'

// const [isEditVisible,setIsEditVisible]=useState(false);
export const EditTaskBottomSheet = ({
  isVisible,
  onClose,
  task,
}: {
  isVisible: boolean
  onClose: (isVisible: boolean) => void
  task: TaskDetailDTO
}) => {
  const sheetRef = useRef<BottomSheet>(null)
  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) onClose(false)
    },
    [onClose]
  )
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
  )
  // const initialValues: EditTaskInput = {
  //   title: task.title,
  //   description: task.description,
  //   endTime: task.endTime,
  //   labelId: task.label.labelId ? String(task.label.labelId) : '',
  // }
  // const handleSumbit = async (raw: EditTaskInput) => {
  //   const values = EditTaskSchema.parse(raw)
  //   await updateTaskItem(task.id, values as any)
  //   onClose(false)
  // }

  return (
    // <View className="absolute insert-0 z-50">
    <Portal>
      <BottomSheet
        ref={sheetRef}
        index={isVisible ? 0 : -1}
        snapPoints={['55%']}
        keyboardBlurBehavior="restore"
        backdropComponent={renderBackdrop}
        onChange={handleSheetChange}
        enablePanDownToClose
        onClose={() => onClose(false)}
      >
        <BottomSheetView style={{ padding: 16 }}>
          <EditTaskForm
            initialValues={{
              title: task.title,
              description: task.description,
              endTime: task.endTime,
              repeat: (task as any).repeat ?? 'none',
              labelId: task.label.labelId ? String(task.label.labelId) : '',
            }}
            onSubmit={async (values) => {
              await updateTaskItem(task.id, values)
              onClose(false)
            }}
            onCancel={() => onClose(false)}
          />
        </BottomSheetView>
      </BottomSheet>
    </Portal>
  )
}

// interface TaskEditCardProp {
//   id: string
//   title: string
//   isCompleted: boolean
//   startTime?: string
//   endTime?: string
// }
