import { View } from "react-native";
import { DateTimeSelector } from "./date-time-selector";
import { Controller } from "react-hook-form";

export const StartEndDateTimePicker = ({ control }: { control: any }) => {
  return (
    <View className="flex-row justify-between">
      <Controller
        control={control}
        name="startTime"
        render={({ field: { value, onChange } }) => {
<<<<<<< HEAD
<<<<<<< HEAD
          return <DateTimeSelector defaultValue={value} changeDateTime={onChange} />;
=======
          return (
            <DateTimeSelector defaultValue={value} changeDateTime={onChange} />
          );
>>>>>>> 6eb4676 (Frontend refactor (#467))
=======
          return <DateTimeSelector defaultValue={value} changeDateTime={onChange} />;
>>>>>>> b91d27e (Bugs fix before launch (#481))
        }}
      />
      <Controller
        control={control}
        name="endTime"
        render={({ field: { value, onChange } }) => {
<<<<<<< HEAD
<<<<<<< HEAD
          return <DateTimeSelector defaultValue={value} changeDateTime={onChange} />;
=======
          return (
            <DateTimeSelector defaultValue={value} changeDateTime={onChange} />
          );
>>>>>>> 6eb4676 (Frontend refactor (#467))
=======
          return <DateTimeSelector defaultValue={value} changeDateTime={onChange} />;
>>>>>>> b91d27e (Bugs fix before launch (#481))
        }}
      />
    </View>
  );
};
