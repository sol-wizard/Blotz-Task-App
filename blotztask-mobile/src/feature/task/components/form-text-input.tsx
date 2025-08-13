import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Controller } from "react-hook-form";

export function FormTextInput({
  name,
  placeholder,
  control,
  className = "",
}: {
  name: string;
  placeholder: string;
  control: any;
  className?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <BottomSheetTextInput
          placeholder={placeholder}
          value={value}
          onChangeText={onChange}
          className={`bg-[#F9FAFB] rounded-2xl h-12 px-2 ${className}`}
        />
      )}
    />
  );
}
