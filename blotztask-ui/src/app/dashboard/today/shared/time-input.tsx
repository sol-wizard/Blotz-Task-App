import 'rc-time-picker/assets/index.css';
import TimePicker from 'rc-time-picker';
import { FormField, FormItem } from '@/components/ui/form';

export const TimeInput = ({ control }) => {
  const format = 'h:mm a';

  return (
    <FormField
      control={control}
      name="time"
      render={({ field }) => (
        <FormItem>
          <TimePicker
            showSecond={false}
            value={field.value}
            className="xxx"
            onChange={(value) => field.onChange(value)}
            format={format}
            placeholder="Time"
            use12Hours
            inputReadOnly
          />
        </FormItem>
      )}
    />
  );
};
