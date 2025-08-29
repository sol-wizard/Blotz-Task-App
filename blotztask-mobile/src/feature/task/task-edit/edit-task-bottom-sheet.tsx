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
import { fetchAllLabel } from '@/shared/services/label-service'

// const [isEditVisible,setIsEditVisible]=useState(false);
export const EditTaskBottomSheet = ({
  isVisible,
  onClose,
  task,
  onEdited,
}: {
  isVisible: boolean
  onClose: (isVisible: boolean) => void
  task: TaskDetailDTO
  onEdited?: (updated: TaskDetailDTO) => void
}) => {
  const sheetRef = useRef<BottomSheetModal>(null)

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
            labelId: task.label?.labelId ?? 0,
          }}
          onSubmit={async (values) => {
            try {
              await updateTaskItem(task.id, values)
              const allLabels = await fetchAllLabel()
              const selectdLabel = allLabels.find(
                (l) => l.labelId === Number(values.labelId)
              )
              const updatedTask: TaskDetailDTO = {
                ...task,
                title: values.title,
                description: values.description,
                repeat: values.repeat ?? 'none',
                label: values.labelId
                  ? {
                      labelId: Number(values.labelId),
                      name: selectdLabel?.name ?? '',
                      color: task.label?.color ?? '#FFFFFF',
                    }
                  : {
                      labelId: 0,
                      name: '',
                      color: '#FFFFFF',
                    },
              }
              onEdited?.(updatedTask)
              onClose(false)
            } catch (err) {
              console.error('updateTaskItem failed', err)
            }
          }}
          onCancel={() => onClose(false)}
        />
      </BottomSheetView>
    </BottomSheetModal>
  )
}
