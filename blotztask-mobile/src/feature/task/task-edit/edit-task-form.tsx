import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { View, Text, TouchableOpacity } from "react-native";
import { FormTextInput } from "@/shared/components/ui/form-text-input";
import {
  EditTaskSchema,
  EditTaskInput,
  EditTaskValues,
} from "./task-form-schema";
import { RepeatMenu } from "../task-creation/repeat-menu";
import { LabelMenu } from "../task-creation/label-menu";
import { useEffect } from "react";
import DateBottomSheetTrigger from "./date-bottom-sheet-trigger";

export type EditTaskFormProps = {
  initialValues: EditTaskValues;
  onSubmit: (values: EditTaskValues) => void;
  onCancel?: () => void;
};
export const EditTaskForm = ({
  initialValues,
  onSubmit,
  onCancel,
}: EditTaskFormProps) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<EditTaskInput>({
    resolver: zodResolver(EditTaskSchema),
    mode: "onChange",
    defaultValues: initialValues,
  });
  useEffect(() => {
    reset({ ...initialValues, endTime: initialValues.endTime ?? "" });
  }, [initialValues, reset]);
  const pressSubmit = handleSubmit(
    (data) => {
      onSubmit(EditTaskSchema.parse(data));
    },
    (errors) => {
      console.log("❌ validation errors:", errors);
    }
  );

  return (
    <View className="gap-3">
      <View className="mb-3">
        <FormTextInput
          control={control}
          name="title"
          placeholder="Task title"
          className="text-lg font-semibold rounded-2xl bg-slate-200 border-slate-200  border px-4 py-3 shadow-sm "
          inputProps={{
            textAlignVertical: "top",
            textAlign: "left",
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
            textAlignVertical: "top",
            textAlign: "left",
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
          className={` rounded-2xl py-5 items-center mt-4 ${
            isValid ? "bg-black" : " bg-gray-200"
          }`}
          onPress={pressSubmit}
          disabled={!isValid || isSubmitting}
        >
          <Text className="text-white text-base font-semibold">
            {isSubmitting ? "saving..." : "Confirm"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="mt-3 items-center"
          onPress={onCancel}
          disabled={isSubmitting}
        >
          <Text className="text-sm text-gray-500"> Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
