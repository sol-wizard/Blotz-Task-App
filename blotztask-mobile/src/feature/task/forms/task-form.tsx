import React, { useEffect, useState } from "react";
import { View, Button, Text } from "react-native";
import { EditTaskItemDTO } from "../models/edit-task-item-dto";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { TaskFormField, taskFormSchema } from "../models/task-form-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormTextInput } from "@/shared/components/ui/form-text-input";
import { Checkbox, RadioButton } from "react-native-paper";
import { StartEndDateTimePicker } from "../components/form/start-end-date-time-picker";
import { LabelSelect } from "../components/form/label-select";
import { SingleDateTimePicker } from "../components/form/single-date-time-picker";

type TaskFormProps = {
  mode: "create" | "edit";
  defaultValues?: EditTaskItemDTO;
  onSubmit: (data: TaskFormField) => void;
};

const TaskForm = ({ mode, defaultValues, onSubmit }: TaskFormProps) => {
  const methods = useForm<TaskFormField>({
    resolver: zodResolver(taskFormSchema),
    mode: "onChange",
    defaultValues: defaultValues
      ? {
          title: defaultValues.title,
          description: defaultValues.description,
          startTime: defaultValues.startTime,
          endTime: defaultValues.endTime,
          labelId: defaultValues.labelId,
          timeType: defaultValues.timeType,
        }
      : undefined,
  });

  const { handleSubmit, formState, control, watch, setValue, resetField } = methods;
  const { isValid, isSubmitting, errors } = formState;

  const formTimeType = watch("timeType");
  const [enableTime, setEnableTime] = useState(!!formTimeType);

  useEffect(() => {
    console.log("TaskForm - Form State:", {
      isValid,
      isSubmitting,
      formTimeType,
      enableTime,
      values: methods.getValues(),
      errors: errors,
    });
  }, [enableTime, errors, formTimeType, isSubmitting, isValid, methods]);

  const clearTimeValues = () => {
    resetField("startDate");
    resetField("startTime");
    resetField("endDate");
    resetField("endTime");
  };

  const handleTimeToggle = () => {
    const newEnableTime = !enableTime;
    setEnableTime(newEnableTime);

    if (!newEnableTime) {
      resetField("timeType");
      clearTimeValues();
    }
  };

  const handleTimeTypeChange = (newValue: "single" | "range") => {
    setValue("timeType", newValue);
    clearTimeValues();
  };

  return (
    <FormProvider {...methods}>
      <View>
        <Text>Title</Text>
        <FormTextInput name="title" placeholder="What needs to be done?" control={control} />

        <Text>Label</Text>
        <LabelSelect control={control} />

        <Text>Description</Text>
        <FormTextInput
          name="description"
          placeholder="Add details about this task (optional)"
          control={control}
        />

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Checkbox status={enableTime ? "checked" : "unchecked"} onPress={handleTimeToggle} />
          <Text>Time</Text>
        </View>

        {enableTime && (
          <View style={{ marginLeft: 20 }}>
            <Controller
              control={control}
              name="timeType"
              render={({ field: { onChange, value } }) => (
                <RadioButton.Group
                  onValueChange={(newValue) => {
                    onChange(newValue);
                    handleTimeTypeChange(newValue as "single" | "range");
                  }}
                  value={value ?? ""}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <RadioButton value="single" />
                    <Text>Single Time</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <RadioButton value="range" />
                    <Text>Time Range</Text>
                  </View>
                </RadioButton.Group>
              )}
            />

            {formTimeType === "single" && (
              <View>
                <Text>Select Time:</Text>
                <SingleDateTimePicker control={control} setValue={setValue} />
              </View>
            )}

            {formTimeType === "range" && (
              <View>
                {errors.startTime && (
                  <Text className="text-red-500 text-sm mt-1">{errors.startTime.message}</Text>
                )}
                {errors.endTime && (
                  <Text className="text-red-500 text-sm mt-1">{errors.endTime.message}</Text>
                )}
                <StartEndDateTimePicker control={control} setValue={setValue} />
              </View>
            )}
          </View>
        )}

        <Button
          title={mode === "create" ? "Create Task" : "Update Task"}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || isSubmitting}
        />
      </View>
    </FormProvider>
  );
};

export default TaskForm;
