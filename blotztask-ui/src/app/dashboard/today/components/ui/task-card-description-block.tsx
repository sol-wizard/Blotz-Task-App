import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

export const TaskCardDescriptionBlock = ({ task, isEditing, control, errors }) => (
  <div className="flex flex-col w-full">
    {isEditing ? (
      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Textarea className="w-full" placeholder={task.description} {...field} />
            </FormControl>
            <FormMessage>{errors.description?.message}</FormMessage>
          </FormItem>
        )}
      />
    //TODO : Remove the logic in css using the variant based design approach
    ) : (
      <p className={`w-[500px] break-words ${task.isDone ? 'text-gray-400' : 'text-black'}`}>{task.description}</p>
    )}
  </div>
);
  