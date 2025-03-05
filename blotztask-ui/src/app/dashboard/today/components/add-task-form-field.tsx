import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { CalendarForm } from '../shared/calendar-form';
import { LabelSelect } from '../shared/label-select';
import { Input } from '@/components/ui/task-card-input';
import { Textarea } from '@/components/ui/textarea';

const AddTaskFormField = ({ form, datePickerRef, labelPickerRef }) => {
  return (
    <>
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
        <div className="flex flex-row space-x-4 items-center flex-1">
          <div className="flex flex-row items-center">
            <CalendarForm control={form.control} datePickerRef={datePickerRef} />
            <LabelSelect control={form.control} labelPickerRef={labelPickerRef} />
          </div>
        </div>
      </div>
    </>
  );
};

export default AddTaskFormField;
