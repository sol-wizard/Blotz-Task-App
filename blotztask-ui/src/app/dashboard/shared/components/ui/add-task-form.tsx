import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { CalendarForm } from './calendar-form';
import { LabelSelect } from './label-select';
import { Input } from '@/components/ui/task-card-input';
import { Textarea } from '@/components/ui/textarea';
import TimePicker from '@/components/ui/time-picker';

const AddTaskForm = ({
  form,
  datePickerRef,
  labelPickerRef,
  timePickerRef,
}: {
  form;
  datePickerRef?: React.RefObject<HTMLDivElement>;
  labelPickerRef?: React.RefObject<HTMLDivElement>;
  timePickerRef?: React.RefObject<HTMLDivElement>;
}) => {
  return (
    <div className="flex flex-col w-full">
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input placeholder="Enter task title" className="font-bold text-base" {...field}></Input>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Textarea placeholder="Fill in the detailed information" className="w-full" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="flex flex-row space-x-4 items-center flex-1 ml-3">
        <div className="flex flex-row items-center">
          <CalendarForm control={form.control} datePickerRef={datePickerRef} />
          <LabelSelect control={form.control} labelPickerRef={labelPickerRef} />
          <TimePicker control={form.control} timePickerRef={timePickerRef} />
        </div>
      </div>
    </div>
  );
};

export default AddTaskForm;
