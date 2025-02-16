import { z } from 'zod';

export const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(50, 'Title cannot exceed 50 characters.'),
  description: z.string().max(200, 'Description cannot exceed 200 characters.'),
  date: z.date(),
  labelId: z.number(),
});
