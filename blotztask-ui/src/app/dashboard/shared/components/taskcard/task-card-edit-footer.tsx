import { Control } from "react-hook-form";
import { CalendarForm } from "../ui/calendar-form";
import { LabelSelect } from "../ui/label-select";
import  TimePicker  from "@/components/ui/time-picker";

export interface TaskFormValues {
  date?: Date;
  time?: string;
  label?: {
    id: string;
    name: string;
    color: string;
  };
}

export const TaskCardEditFooter = ({ control, onCancel } : {control: Control<TaskFormValues>; onCancel: () => void; }) => (
    <div className="flex flex-row justify-between mt-4 mb-2 pl-2">
      <div className="flex flex-row items-center">
        <CalendarForm control={control} />
        <LabelSelect
          control={control} />
        <TimePicker control={control} />
      </div>
    

    <div className="w-full"> 
      <div className="flex justify-end">

      <div className="flex flex-row space-x-2">
        <button 
            type="button" 
            className="bg-neutral-300 rounded-lg px-3 py-2 text-xs text-gray-700 w-20" 
            onClick={onCancel}
        >
          Cancel
        </button>
        <button 
            type="submit" 
            className="bg-primary rounded-lg px-3 py-1 text-xs text-white w-20"
        >
          Save
        </button>
      </div>
      </div>
    </div>
    </div>
  );
