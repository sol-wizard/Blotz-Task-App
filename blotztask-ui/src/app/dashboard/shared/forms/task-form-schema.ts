import { isValid, parse } from 'date-fns';
import { z } from 'zod';

const timeSchema = z.string().refine(
  (time) => {
    if (!time) return true; // skip validation if empty

    const parsedTime = parse(time, 'h:mm a', new Date());
    return isValid(parsedTime);
  },
  { message: 'Time must be in correct format.' }
);

export const taskFormSchema = z.object({
  title: z.string().min(1,'Title is required').max(50, 'Title cannot exceed 50 characters.'),
  description: z.string().max(200, 'Description cannot exceed 200 characters.').optional(),
  
  date: z.date({
    required_error: 'Date is required',
    invalid_type_error: 'Date must be a valid date',
  }),

  labelId: z
    .number({
      required_error: 'Label is required',
      invalid_type_error: 'Label must be a number',
    }),

  time: timeSchema.optional(), 
});