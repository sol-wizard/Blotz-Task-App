import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'
import {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetModal,
} from '@gorhom/bottom-sheet'
import { TaskDetailDTO } from '@/shared/models/task-detail-dto'
import { EditTaskForm } from './edit-task-form'
import { updateTaskItem } from '../services/task-service'
import { fetchAllLabel } from '@/shared/services/label-service'

export type EditTaskBottomSheetHandle = {
  present: () => void
  dismiss: () => void
}

export const EditTaskBottomSheet = forwardRef<
  EditTaskBottomSheetHandle,
  {
    task: TaskDetailDTO
    onEdited?: (t: TaskDetailDTO) => void
    onClose?: () => void
  }
>(({ task, onEdited, onClose }, ref) => {
  const modalRef = useRef<BottomSheetModal>(null)

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
  useImperativeHandle(ref, () => ({
    present: () => modalRef.current?.present(),
    dismiss: () => modalRef.current?.dismiss(),
  }))

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={['55%']}
      keyboardBlurBehavior="restore"
      backdropComponent={renderBackdrop}
      // onChange={handleSheetChange}
      enablePanDownToClose
      onDismiss={onClose}
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
              onClose
            } catch (err) {
              console.error('updateTaskItem failed', err)
            }
          }}
          onCancel={onClose}
        />
      </BottomSheetView>
    </BottomSheetModal>
  )
})
