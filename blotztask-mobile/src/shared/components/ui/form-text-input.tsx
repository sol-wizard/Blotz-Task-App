import { Controller } from "react-hook-form";
import { TextInput, TextInputProps } from "react-native";

export function FormTextInput({
  name,
  placeholder,
  control,
  className = "",
  inputProps,
}: {
  name: string;
  placeholder: string;
  control: any;
  className?: string;
  inputProps?: TextInputProps;
}) {
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
