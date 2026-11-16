import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { Ref } from "react";
import { TextInput, TextInputProps } from "react-native";

export function FormTextInput<T extends FieldValues>({
  name,
  placeholder,
  control,
  className = "",
  inputProps,
  inputRef,
}: {
  name: Path<T>;
  placeholder: string;
  control: Control<T>;
  className?: string;
  inputProps?: TextInputProps;
  inputRef?: Ref<TextInput>;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <TextInput
          ref={inputRef}
          placeholder={placeholder}
          onBlur={onBlur}
          onChangeText={onChange}
          value={value}
          multiline
          className={className}
          {...inputProps}
        />
      )}
    />
  );
}
