import { Controller } from "react-hook-form";
import { TextInput } from "react-native-paper";

export function RHFTextInput({
  name,
  label,
  control,
  className = "",
}: {
  name: string;
  label: string;
  control: any;
  className?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <TextInput
          label={label}
          value={value}
          onChangeText={onChange}
          className={className}
        />
      )}
    />
  );
}
