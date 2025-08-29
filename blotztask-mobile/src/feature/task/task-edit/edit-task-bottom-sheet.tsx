// import { Portal } from 'react-native-paper'
import { useCallback, useEffect, useRef } from 'react'
import {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetModal,
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
  const sheetRef = useRef<BottomSheetModal>(null)
  // const handleSheetChange = useCallback(
  //   (index: number) => {
  //     if (index === -1) onClose(false)
  //   },
  //   [onClose]
  // )
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
  //show/hide modal
  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.present()
    } else {
      sheetRef.current?.dismiss()
    }
  }, [isVisible])

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['55%']}
      keyboardBlurBehavior="restore"
      backdropComponent={renderBackdrop}
      // onChange={handleSheetChange}
      enablePanDownToClose
      onDismiss={() => onClose(false)}
    >
      <BottomSheetView style={{ padding: 16 }}>
        <EditTaskForm
          initialValues={{
            title: task.title,
            description: task.description,
            endTime: task.endTime,
            repeat: (task as any).repeat ?? 'none',
            labelId: task.label?.labelId ? String(task.label.labelId) : '',
          }}
          onSubmit={async (values) => {
            await updateTaskItem(task.id, values)
            onClose(false)
          }}
          onCancel={() => onClose(false)}
        />
      </BottomSheetView>
    </BottomSheetModal>
  )
}
