import TimePicker from "@/components/ui/time-picker";
import { CalendarForm } from "../../shared/calendar-form";
import { LabelSelect } from "../../shared/label-select";

export const TaskCardEditFooter = ({ control, onCancel }) => (
    <div className="flex flex-row justify-between mt-4 mb-2">
      <div className="flex flex-row items-center">
        <CalendarForm control={control} />
        <LabelSelect control={control} />
        <TimePicker control={control} />
      </div>
      <div className="flex flex-row">
        <button 
            type="button" 
            className="bg-neutral-300 rounded-lg px-3 py-2 text-xs text-gray-700 mx-2 w-20" 
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
  );
  