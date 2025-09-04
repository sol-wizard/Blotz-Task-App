import { forwardRef, useImperativeHandle, useCallback, useRef } from 'react'
import {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetModal,
} from '@gorhom/bottom-sheet'
import { TaskDetailDTO } from '@/shared/models/task-detail-dto'
import { EditTaskForm } from './edit-task-form'
import { updateTaskItem } from '../services/task-service'
import { fetchAllLabel } from '@/shared/services/label-service'
import { EditTaskSchema, EditTaskValues } from './task-form-schema'

export type EditTaskBottomSheetHandle = {
  present: () => void
  dismiss: () => void
}
type Props = {
  task: TaskDetailDTO
  onClose?: () => void
  onEdited?: (updated: TaskDetailDTO) => void
}
export const EditTaskBottomSheet = forwardRef<EditTaskBottomSheetHandle, Props>(
  ({ task, onClose, onEdited }, ref) => {
    const sheetRef = useRef<BottomSheetModal>(null)

    useImperativeHandle(ref, () => ({
      present: () => sheetRef.current?.present(),
      dismiss: () => sheetRef.current?.dismiss(),
    }))
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
    const handleSubmit = async (values: EditTaskValues) => {
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
        sheetRef.current?.dismiss()
      } catch (err) {
        console.error('updateTaskItem failed', err)
      }
    }

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={['55%']}
        keyboardBlurBehavior="restore"
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        onDismiss={onClose}
      >
        <BottomSheetView style={{ padding: 16 }}>
          <EditTaskForm
            initialValues={EditTaskSchema.parse({
              title: task.title,
              description: task.description,
              endTime: task.endTime,
              repeat: (task as any).repeat,
              labelId: task.label?.labelId,
            })}
            onSubmit={handleSubmit}
            onCancel={() => sheetRef.current?.dismiss()}
          />
        </BottomSheetView>
      </BottomSheetModal>
    )
  }
)
EditTaskBottomSheet.displayName = 'EditTaskBottomSheet'
