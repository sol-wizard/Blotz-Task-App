import { isValid, parse } from 'date-fns';
import { z } from 'zod';

const timeSchema = z.string().refine(
  (time) => {
    const parsedTime = parse(time, 'h:mm a', new Date());
    return isValid(parsedTime);
  },
  { message: 'Time must be in correct format.' }
);

export const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(50, 'Title cannot exceed 50 characters.'),
  description: z.string().max(200, 'Description cannot exceed 200 characters.'),
  date: z.date(),
  labelId: z.number(),
  time: timeSchema.optional(),
});