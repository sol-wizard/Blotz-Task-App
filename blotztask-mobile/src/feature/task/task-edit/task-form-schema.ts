import { z } from 'zod'

export const EditTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(120, 'Max 120 characters.'),
  description: z.string().trim().max(2000, 'Max 2000 characters.').default(''),
  endTime: z.string().default(''),
  repeat: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
  labelId: z.preprocess((val) => Number(val), z.number()),
})
export type EditTaskInput = z.input<typeof EditTaskSchema>
export type EditTaskValues = z.output<typeof EditTaskSchema>
