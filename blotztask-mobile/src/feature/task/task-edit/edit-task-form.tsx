import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { View, Text, TouchableOpacity } from 'react-native'
import { FormTextInput } from '@/shared/components/ui/form-text-input'
import {
  EditTaskSchema,
  EditTaskInput,
  EditTaskValues,
} from './task-form-schema'
// import BottomSheet, {
//   BottomSheetBackdrop,
//   BottomSheetView,
// } from '@gorhom/bottom-sheet'
import { RepeatMenu } from '../task-creation/repeat-menu'
import { LabelMenu } from '../task-creation/label-menu'
import DateBottomSheetTrigger from '@/feature/task/task-edit/dateSelector'

// const schema = z.object({
//   title: z
//     .string()
//     .trim()
//     .min(1, 'Title is required.')
//     .max(120, 'Max 120 characters.'),
//   description: z.string().trim().max(2000, 'Max 2000 characters.').default(''),
//   endTime: z.string().default(''),
//   repeat: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
//   labelId: z.string().default(''),
// })
// type FormInput = z.input<typeof schema>
// type EditTaskValues = z.output<typeof schema>
export type EditTaskFormProps = {
  initialValues: EditTaskValues
  onSubmit: (values: EditTaskValues) => void
  // onSubmit: SubmitHandler<EditTaskValues>
  onCancel: () => void
}
export const EditTaskForm = ({
  initialValues,
  onSubmit,
  onCancel,
}: EditTaskFormProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<EditTaskInput>({
    resolver: zodResolver(EditTaskSchema),
    mode: 'onChange',
    defaultValues: initialValues,
  })
  const pressSubmit = () => {
    void handleSubmit((raw: EditTaskInput) => {
      const parsed = EditTaskSchema.parse(raw)
      onSubmit(parsed)
    })()
  }
  return (
    <View className="gap-3">
      <View className="mb-3">
        <FormTextInput
          control={control}
          name="title"
          placeholder="Task title"
          className="text-lg font-semibold rounded-2xl bg-slate-200 border-slate-200  border px-4 py-3 shadow-sm "
          inputProps={{
            textAlignVertical: 'top',
            textAlign: 'left',
            style: {
              paddingTop: 10,
              lineHeight: 20,
            },
          }}
        />
        {errors.title && (
          <Text className="text-red-500 text-xs">{errors.title.message}</Text>
        )}
      </View>
      {/* description */}
      <View className="mb-3 ">
        <FormTextInput
          name="description"
          placeholder="Description..."
          className=" text-black  px-4 py-3 border bg-slate-200 border-slate-200  shadow-sm h-40 "
          control={control}
          inputProps={{
            multiline: true,
            numberOfLines: 5,
            textAlignVertical: 'top',
            textAlign: 'left',
          }}
        />
        {errors.description && (
          <Text className="text-red-500 text-xs">
            {errors.description.message}
          </Text>
        )}
      </View>
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <DateBottomSheetTrigger control={control} />
        </View>
        <View className="flex-1">
          <RepeatMenu control={control} />
        </View>
        <View className="flex-1">
          <LabelMenu control={control} />
        </View>
      </View>

      {/* button */}
      <View className="mt-2">
        <TouchableOpacity
          className={`bg-black rounded-2xl py-5 items-center mt-4 ${
            isValid ? 'bg-gray-300' : ' bg-gray-200'
          }`}
          onPress={pressSubmit}
          disabled={!isValid || isSubmitting}
        >
          <Text className="text-white text-base font-semibold">
            {isSubmitting ? 'saving...' : 'Confirm'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="mt-3 items-center"
          onPress={onCancel}
          disabled={isSubmitting}
        >
          <Text className="text-sm text-gray-500"> Cancel</Text>
        </TouchableOpacity>
        {/* date & time
        <DateTimeBottomSheet
          control={control}
          isVisible={dtVisible}
          // initialText={datetime}
          onClose={() => setDtVisible(false)}
          handleCreateTaskBottomSheetOpen={() => {}}
          // onConfirm={(displayText) => {
          //   setValue("datetime", displayText, { shouldValidate: true });
          //   setDtVisible(false);
          // }}
        />
        <RepeatMenu control={control}></RepeatMenu>
        <LabelMenu /> */}
      </View>
    </View>
  )
}
