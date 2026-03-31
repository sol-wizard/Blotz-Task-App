import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { TextInput, TextInputProps } from "react-native";

type FormTextInputProps<TFieldValues extends FieldValues> = {
  name: Path<TFieldValues>;
  placeholder: string;
  control: Control<TFieldValues>;
  className?: string;
  inputProps?: TextInputProps;
};

export function FormTextInput<TFieldValues extends FieldValues>({
  name,
  placeholder,
  control,
  className = "",
  inputProps,
}: FormTextInputProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <TextInput
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
