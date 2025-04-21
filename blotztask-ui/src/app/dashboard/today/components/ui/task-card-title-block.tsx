import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/task-card-input";
import DateTag from "./due-date-tag";

export const TaskCardTitleBlock = ({ task, isEditing, control, errors }) => {
    return (
      <div className="flex justify-between">
        {isEditing ? (
          <FormField
            control={control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input className="font-bold" {...field} />
                </FormControl>
                <FormMessage>{errors.title?.message}</FormMessage>
              </FormItem>
            )}
          />
        ) : (
          <p className={`font-bold ${task.isDone ? 'text-gray-400' : 'text-black'}`}>{task.title}</p>
        )}
        {!isEditing && <DateTag task={task} />}
      </div>
    );
};
  